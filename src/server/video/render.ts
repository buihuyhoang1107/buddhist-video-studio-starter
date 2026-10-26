import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import type { DharmaReview } from "@/core/contracts/project";
import type { GenerationJob } from "@/core/contracts/job";
import { jobDir, outputRoot } from "@/server/filesystem/paths";
import { readJson } from "@/server/filesystem/json-file";
import { updateJob } from "@/server/jobs/job-repository";
import { runFfmpeg } from "@/server/ffmpeg/run";
import { assetPath, loadStoryboard, lockJob, requireJob, VideoError } from "./job-assets";
import { sceneSubtitles } from "./subtitles";

export async function startRender(id: string, approved: boolean, withoutVoice = false): Promise<GenerationJob> {
  const job = await requireJob(id);
  const unlock = await lockJob(id);
  try {
    if (!approved) throw new VideoError("Bạn cần xác nhận đã duyệt nội dung và hình ảnh.");
    if (job.config.voiceMode !== "NONE" && !withoutVoice) throw new VideoError("Bản render này chưa hỗ trợ voice. Xác nhận render không giọng đọc để tiếp tục với storyboard hiện tại.");
    const review = await readJson<DharmaReview>(path.join(jobDir(id), "dharma-review.json"));
    if (!review.approved) throw new VideoError("Nội dung chưa vượt qua Dharma Review.", 409);
    const board = await loadStoryboard(id);
    if (!board.scenes.length || board.scenes.length > 10) throw new VideoError("Storyboard cần từ 1 đến 10 cảnh.");
    for (const [i, scene] of board.scenes.entries()) {
      if (!scene.imagePath) throw new VideoError(`Cảnh ${i + 1} chưa có ảnh.`);
      if (!Number.isFinite(scene.duration) || scene.duration <= 0 || scene.duration > 300) throw new VideoError(`Thời lượng cảnh ${i + 1} không hợp lệ.`);
      await fs.access(assetPath(id, scene.imagePath));
    }
    const started = await updateJob(id, { status: "RENDERING", progress: 65, error: undefined, outputPath: undefined, currentStep: "Đang chuẩn bị FFmpeg" });
    // Keep the filesystem lock until the background render finishes.
    void render(id, board, job.config.audience === "SENIOR").catch(async (error) => {
      await updateJob(id, { status: "FAILED", currentStep: "Render thất bại; ảnh và storyboard đã được giữ để thử lại", error: error instanceof Error ? error.message : String(error) });
    }).finally(unlock).catch(console.error);
    return started;
  } catch (error) { await unlock(); throw error; }
}

async function render(id: string, board: Awaited<ReturnType<typeof loadStoryboard>>, senior: boolean) {
  const folder = path.join(jobDir(id), "render");
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(outputRoot, { recursive: true });
  const clips: string[] = [];
  for (const [index, scene] of board.scenes.entries()) {
    const image = assetPath(id, scene.imagePath!);
    const hash = createHash("sha256").update(await fs.readFile(image)).update(JSON.stringify(["portrait-v1", scene.subtitle, scene.duration, senior])).digest("hex");
    const clip = `${hash}.mp4`;
    try { await fs.access(path.join(folder, clip)); }
    catch {
      // Decode once without looping: a corrupt image must fail instead of looping forever.
      await runFfmpeg(["-v", "error", "-xerror", "-i", image, "-frames:v", "1", "-f", "null", "-"]);
      await fs.writeFile(path.join(folder, `${hash}.ass`), sceneSubtitles(scene.subtitle, scene.duration, senior), "utf8");
      const partial = `${hash}.partial.mp4`;
      await runFfmpeg([
        "-y", "-loop", "1", "-framerate", "25", "-i", image,
        "-t", String(scene.duration),
        "-vf", `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x171b18,setsar=1,subtitles=${hash}.ass`,
        "-an", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-r", "25", "-threads", "2", partial
      ], folder);
      await fs.rename(path.join(folder, partial), path.join(folder, clip));
    }
    clips.push(clip);
    await updateJob(id, { progress: 65 + Math.round((index + 1) / board.scenes.length * 25), currentStep: `Đã xử lý cảnh ${index + 1}/${board.scenes.length}` });
  }
  await fs.writeFile(path.join(folder, "concat.txt"), clips.map((clip) => `file '${clip}'`).join("\n"), "utf8");
  const temporary = path.join(outputRoot, `${id}.partial.mp4`);
  await runFfmpeg(["-y", "-f", "concat", "-safe", "1", "-i", "concat.txt", "-c", "copy", "-movflags", "+faststart", temporary], folder);
  await updateJob(id, { status: "QA", progress: 95, currentStep: "Kiểm tra giải mã video MP4" });
  await runFfmpeg(["-v", "error", "-xerror", "-i", temporary, "-f", "null", "-"]);
  const output = path.join(outputRoot, `${id}.mp4`);
  await fs.rename(temporary, output);
  await updateJob(id, { status: "COMPLETED", progress: 100, outputPath: output, currentStep: "Video đã sẵn sàng. Xem trước và tải MP4." });
}
