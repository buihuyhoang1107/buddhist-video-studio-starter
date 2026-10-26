import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { jobDir } from "@/server/filesystem/paths";
import { writeJson } from "@/server/filesystem/json-file";
import { updateJob } from "@/server/jobs/job-repository";
import { estimateDuration, fitAudioDuration } from "@/core/narration/timing";
import { runFfmpeg } from "@/server/ffmpeg/run";
import { normalizeAudio, pcmToWav } from "./audio";
import { imageExtension, loadStoryboard, lockJob, mediaPath, requireJob, storyboardView, VideoError } from "./job-assets";

export async function saveMedia(id: string, kind: string, file: File) {
  await requireJob(id);
  if (!["background", "audio"].includes(kind)) throw new VideoError("Loại tài nguyên không hợp lệ.");
  if (!file.size || file.size > 100 * 1024 * 1024) throw new VideoError("File cần từ 1 byte đến 100 MB.");
  const unlock = await lockJob(id);
  const created: string[] = [];
  let committed = false;
  try {
    const board = await loadStoryboard(id);
    const bytes = Buffer.from(await file.arrayBuffer());
    const uuid = randomUUID();
    let extension: string;
    let video = false;
    if (kind === "audio") extension = "input";
    else if (bytes.toString("ascii", 4, 8) === "ftyp") { extension = "mp4"; video = true; }
    else if (bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))) { extension = "webm"; video = true; }
    else {
      extension = imageExtension(bytes);
      if (file.size > 10 * 1024 * 1024) throw new VideoError("Ảnh tối đa 10 MB.");
    }
    const name = `${uuid}.${extension}`;
    const target = mediaPath(id, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    created.push(target);
    await fs.writeFile(target, bytes);
    let previous: string | undefined;
    if (kind === "audio") {
      const pcm = path.join(path.dirname(target), `${uuid}.pcm`);
      const wavName = `${uuid}.wav`;
      const wav = mediaPath(id, wavName);
      created.push(pcm, wav);
      const durationSeconds = await normalizeAudio(target, pcm);
      await pcmToWav(pcm, wav);
      previous = board.audio?.path;
      board.audio = { path: wavName, provider: "USER_AUDIO", durationSeconds, timing: "ESTIMATED_SEGMENTS" };
      fitAudioDuration(board.scenes, durationSeconds);
      await fs.rm(pcm, { force: true });
      await fs.rm(target, { force: true });
    } else {
      await runFfmpeg(["-v", "error", "-xerror", "-i", target, "-map", "0:v:0", "-frames:v", "1", "-f", "null", "-"]);
      previous = board.background?.path;
      board.background = { kind: video ? "VIDEO" : "IMAGE", path: name };
    }
    await writeJson(path.join(jobDir(id), "storyboard.json"), board);
    committed = true;
    await updateJob(id, { status: "IMAGES", progress: 60, error: undefined, outputPath: undefined, currentStep: "Đã lưu tài nguyên. Duyệt nội dung trước khi tạo video." });
    if (previous) await fs.rm(mediaPath(id, previous), { force: true });
    return storyboardView(id);
  } finally {
    if (!committed) for (const file of created) await fs.rm(file, { force: true });
    await unlock();
  }
}

export async function removeMedia(id: string, kind: string) {
  const job = await requireJob(id);
  if (kind !== "background" && kind !== "audio") throw new VideoError("Loại tài nguyên không hợp lệ.");
  const unlock = await lockJob(id);
  try {
    const board = await loadStoryboard(id);
    const previous = kind === "background" ? board.background?.path : board.audio?.path;
    if (kind === "background") delete board.background;
    else {
      delete board.audio;
      for (const scene of board.scenes) scene.duration = estimateDuration(scene.narration, job.config.audience);
    }
    await writeJson(path.join(jobDir(id), "storyboard.json"), board);
    await updateJob(id, { status: "IMAGES", progress: 60, error: undefined, outputPath: undefined, currentStep: "Đã bỏ tài nguyên ghi đè. Duyệt và tạo lại video." });
    if (previous) await fs.rm(mediaPath(id, previous), { force: true });
    return storyboardView(id);
  } finally { await unlock(); }
}
