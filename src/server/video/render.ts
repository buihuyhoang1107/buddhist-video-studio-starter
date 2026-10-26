import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import type { DharmaReview, VoiceMode } from "@/core/contracts/project";
import type { GenerationJob } from "@/core/contracts/job";
import { jobDir, outputRoot } from "@/server/filesystem/paths";
import { readJson } from "@/server/filesystem/json-file";
import { updateJob } from "@/server/jobs/job-repository";
import { runFfmpeg } from "@/server/ffmpeg/run";
import { assetPath, loadStoryboard, lockJob, mediaPath, requireJob, VideoError } from "./job-assets";
import { sceneSubtitles, storySubtitles } from "./subtitles";
import { prepareNarration } from "./audio";

export async function startRender(id: string, approved: boolean, withoutVoice = false, requestedVoice?: VoiceMode): Promise<GenerationJob> {
  const job = await requireJob(id);
  const unlock = await lockJob(id);
  try {
    if (!approved) throw new VideoError("Bạn cần xác nhận đã duyệt nội dung và hình ảnh.");
    const voiceMode = withoutVoice ? "NONE" : requestedVoice ?? job.config.voiceMode;
    if (!["NONE", "LOCAL_TTS", "USER_AUDIO"].includes(voiceMode)) throw new VideoError("Chế độ giọng đọc không hợp lệ.");
    const review = await readJson<DharmaReview>(path.join(jobDir(id), "dharma-review.json"));
    if (!review.approved) throw new VideoError("Nội dung chưa vượt qua Dharma Review.", 409);
    const board = await loadStoryboard(id);
    if (!board.scenes.length || board.scenes.length > 2000) throw new VideoError("Storyboard cần từ 1 đến 2000 đoạn lời kể.");
    if (voiceMode === "USER_AUDIO" && board.audio?.provider !== "USER_AUDIO") throw new VideoError("Vui lòng upload file giọng đọc cho toàn bộ truyện.");
    if (board.background) await fs.access(mediaPath(id, board.background.path));
    for (const [i, scene] of board.scenes.entries()) {
      if (!board.background && !scene.imagePath) throw new VideoError(`Chọn một ảnh/video nền chung, hoặc upload ảnh cho cảnh ${i + 1}.`);
      if (!Number.isFinite(scene.duration) || scene.duration <= 0 || scene.duration > 3600) throw new VideoError(`Thời lượng cảnh ${i + 1} không hợp lệ.`);
      if (!board.background) await fs.access(assetPath(id, scene.imagePath!));
    }
    const started = await updateJob(id, { status: voiceMode === "NONE" ? "RENDERING" : "VOICE", progress: 61, error: undefined, outputPath: undefined, currentStep: voiceMode === "NONE" ? "Đang chuẩn bị FFmpeg" : "Đang chuẩn bị lời kể liên tục" });
    // Keep the filesystem lock until the background render finishes.
    void (async () => {
      const audio = voiceMode === "NONE" ? undefined : await prepareNarration(id, board, job.config);
      await updateJob(id, { status: "RENDERING", progress: 70, currentStep: "Đang dựng video theo lời kể" });
      await render(id, board, job.config.audience === "SENIOR", audio);
    })().catch(async (error) => {
      await updateJob(id, { status: "FAILED", currentStep: "Render thất bại; ảnh và storyboard đã được giữ để thử lại", error: error instanceof Error ? error.message : String(error) });
    }).finally(unlock).catch(console.error);
    return started;
  } catch (error) { await unlock(); throw error; }
}

async function render(id: string, board: Awaited<ReturnType<typeof loadStoryboard>>, senior: boolean, audio?: NonNullable<typeof board.audio>) {
  const folder = path.join(jobDir(id), "render");
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(outputRoot, { recursive: true });
  const duration = audio?.durationSeconds ?? board.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  if (duration > 3600) throw new VideoError("Video vượt giới hạn 60 phút.");
  const timeout = Math.max(180000, duration * 3000);
  const temporary = path.join(outputRoot, `${id}.partial.mp4`);
  if (board.background) {
    await fs.writeFile(path.join(folder, "narration.ass"), storySubtitles(board.scenes, senior), "utf8");
    const source = mediaPath(id, board.background.path);
    await runFfmpeg([
      "-y", ...(board.background.kind === "VIDEO" ? ["-stream_loop", "-1"] : ["-loop", "1", "-framerate", "25"]), "-i", source,
      ...(audio ? ["-i", mediaPath(id, audio.path)] : []),
      "-map", "0:v:0", ...(audio ? ["-map", "1:a:0", "-c:a", "aac", "-b:a", "128k"] : ["-an"]),
      "-t", String(duration), "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x171b18,setsar=1,subtitles=narration.ass",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", "25", "-threads", "2", "-movflags", "+faststart", temporary
    ], folder, timeout);
  } else {
  const clips: string[] = [];
  let elapsed = 0;
  for (const [index, scene] of board.scenes.entries()) {
    const startFrame = Math.ceil(elapsed * 25 - 1e-8);
    elapsed += scene.duration;
    const endFrame = Math.ceil(elapsed * 25 - 1e-8);
    const clipDuration = Math.max(1, endFrame - startFrame) / 25;
    const image = assetPath(id, scene.imagePath!);
    const hash = createHash("sha256").update(await fs.readFile(image)).update(JSON.stringify(["portrait-v3", scene.subtitle, scene.duration, clipDuration, senior])).digest("hex");
    const clip = `${hash}.mp4`;
    try { await fs.access(path.join(folder, clip)); }
    catch {
      // Decode once without looping: a corrupt image must fail instead of looping forever.
      await runFfmpeg(["-v", "error", "-xerror", "-i", image, "-frames:v", "1", "-f", "null", "-"]);
      await fs.writeFile(path.join(folder, `${hash}.ass`), sceneSubtitles(scene.subtitle, scene.duration, senior), "utf8");
      const partial = `${hash}.partial.mp4`;
      await runFfmpeg([
        "-y", "-loop", "1", "-framerate", "25", "-i", image,
        "-t", String(clipDuration),
        "-vf", `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x171b18,setsar=1,subtitles=${hash}.ass`,
        "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", "25", "-threads", "2", partial
      ], folder);
      await fs.rename(path.join(folder, partial), path.join(folder, clip));
    }
    clips.push(clip);
    await updateJob(id, { progress: 70 + Math.round((index + 1) / board.scenes.length * 20), currentStep: `Đã xử lý cảnh ${index + 1}/${board.scenes.length}` });
  }
  await fs.writeFile(path.join(folder, "concat.txt"), clips.map((clip) => `file '${clip}'`).join("\n"), "utf8");
  await runFfmpeg(["-y", "-f", "concat", "-safe", "1", "-i", "concat.txt",
    ...(audio ? ["-i", mediaPath(id, audio.path), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k"] : ["-c", "copy"]),
    "-t", String(duration), "-movflags", "+faststart", temporary], folder, timeout);
  }
  await updateJob(id, { status: "QA", progress: 95, currentStep: "Kiểm tra giải mã video MP4" });
  await runFfmpeg(["-v", "error", "-xerror", "-i", temporary, "-f", "null", "-"], undefined, timeout);
  const output = path.join(outputRoot, `${id}.mp4`);
  await fs.rename(temporary, output);
  await updateJob(id, { status: "COMPLETED", progress: 100, outputPath: output, currentStep: "Video đã sẵn sàng. Xem trước và tải MP4." });
}
