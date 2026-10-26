import path from "node:path";
import { promises as fs } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import type { Storyboard, VideoProjectConfig } from "@/core/contracts/project";
import { VieneuVoiceProvider } from "@/providers/voice/vieneu-voice-provider";
import { fitAudioDuration } from "@/core/narration/timing";
import { jobDir } from "@/server/filesystem/paths";
import { writeJson } from "@/server/filesystem/json-file";
import { updateJob } from "@/server/jobs/job-repository";
import { runFfmpeg } from "@/server/ffmpeg/run";
import { mediaPath, VideoError } from "./job-assets";

export async function normalizeAudio(input: string, pcm: string) {
  // Streaming WAV (including VieNeu) uses 0xffffffff sizes until EOF. Finalize those
  // fields before strict decoding so a valid final short packet is not called corrupt.
  const handle = await fs.open(input, "r+");
  try {
    const { size } = await handle.stat();
    const header = Buffer.alloc(Math.min(size, 65536));
    await handle.read(header, 0, header.length, 0);
    if (header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WAVE" && header.readUInt32LE(4) === 0xffffffff) {
      for (let offset = 12; offset + 8 <= header.length;) {
        const length = header.readUInt32LE(offset + 4);
        if (header.toString("ascii", offset, offset + 4) === "data" && length === 0xffffffff) {
          const bytes = Buffer.alloc(4);
          bytes.writeUInt32LE(size - offset - 8);
          await handle.write(bytes, 0, 4, offset + 4);
          bytes.writeUInt32LE(size - 8);
          await handle.write(bytes, 0, 4, 4);
          break;
        }
        offset += 8 + length + (length % 2);
      }
    }
  } finally { await handle.close(); }
  await runFfmpeg(["-v", "error", "-xerror", "-y", "-i", input, "-map", "0:a:0", "-t", "3601", "-vn", "-ac", "1", "-ar", "24000", "-f", "s16le", pcm]);
  const duration = (await fs.stat(pcm)).size / 48000;
  if (!Number.isFinite(duration) || duration < 0.1 || duration > 3600) throw new VideoError("Audio cần có thời lượng từ 0,1 giây đến 60 phút.");
  return duration;
}

export async function pcmToWav(pcm: string, wav: string) {
  await runFfmpeg(["-v", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, "-c:a", "pcm_s16le", wav]);
}

export async function prepareNarration(id: string, board: Storyboard, config: VideoProjectConfig) {
  // Explicit user uploads always take precedence over generated audio.
  if (board.audio?.provider === "USER_AUDIO") {
    await fs.access(mediaPath(id, board.audio.path));
    fitAudioDuration(board.scenes, board.audio.durationSeconds);
    return board.audio;
  }
  const directory = path.join(jobDir(id), "voice");
  await fs.mkdir(directory, { recursive: true });
  const provider = new VieneuVoiceProvider(directory);
  const fingerprint = createHash("sha256").update(provider.fingerprint()).update(JSON.stringify(board.scenes.map(scene => scene.narration))).digest("hex");
  if (board.audio?.fingerprint === fingerprint) {
    try { await fs.access(mediaPath(id, board.audio.path)); return board.audio; } catch { /* Reuse segment cache if the joined file was removed. */ }
  }
  const pcmFiles: string[] = [];
  for (const [index, scene] of board.scenes.entries()) {
    const key = createHash("sha256").update(provider.fingerprint()).update(scene.narration).digest("hex");
    const pcm = path.join(directory, `${key}.pcm`);
    try {
      const size = (await fs.stat(pcm)).size;
      if (size < 4800 || size % 2) throw new Error("Invalid audio cache");
      scene.duration = size / 48000;
    } catch {
      const generated = await provider.generate(scene.narration, { audience: config.audience });
      const partial = `${pcm}.partial`;
      try {
        scene.duration = await normalizeAudio(generated.path, partial);
        await fs.rename(partial, pcm);
      } finally {
        await fs.rm(generated.path, { force: true });
        await fs.rm(partial, { force: true });
      }
    }
    pcmFiles.push(pcm);
    await updateJob(id, { status: "VOICE", progress: 61 + Math.round((index + 1) / board.scenes.length * 9), currentStep: `Đang nối lời kể ${index + 1}/${board.scenes.length}` });
  }
  const name = `${randomUUID()}.wav`;
  const target = mediaPath(id, name);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const joined = path.join(directory, `${randomUUID()}.pcm`);
  await fs.writeFile(joined, Buffer.alloc(0));
  try {
    // No silence, padding, fade, or per-scene AAC delay between the narration segments.
    for (const pcm of pcmFiles) await fs.appendFile(joined, await fs.readFile(pcm));
    const durationSeconds = (await fs.stat(joined)).size / 48000;
    if (durationSeconds > 3600) throw new VideoError("Tổng lời kể vượt giới hạn 60 phút cho một video.");
    await pcmToWav(joined, target);
    board.audio = { path: name, provider: "LOCAL_TTS", durationSeconds, timing: "MEASURED_SEGMENTS", fingerprint };
    await writeJson(path.join(jobDir(id), "storyboard.json"), board);
    return board.audio;
  } finally { await fs.rm(joined, { force: true }); }
}
