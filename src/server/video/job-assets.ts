import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import type { Storyboard } from "@/core/contracts/project";
import type { StoryboardView } from "@/core/contracts/storyboard-view";
import { jobDir } from "@/server/filesystem/paths";
import { readJson, writeJson } from "@/server/filesystem/json-file";
import { getJob, updateJob } from "@/server/jobs/job-repository";

export class VideoError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function requireJob(id: string) {
  const job = await getJob(id);
  if (!job) throw new VideoError("Không tìm thấy job.", 404);
  return job;
}

export async function lockJob(id: string) {
  const file = path.join(jobDir(id), "video.lock");
  try {
    const handle = await fs.open(file, "wx");
    return async () => { await handle.close(); await fs.rm(file, { force: true }); };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new VideoError("Job đang upload hoặc render. Vui lòng chờ hoàn tất.", 409);
    }
    throw error;
  }
}

export async function loadStoryboard(id: string) {
  try { return await readJson<Storyboard>(path.join(jobDir(id), "storyboard.json")); }
  catch { throw new VideoError("Storyboard chưa sẵn sàng.", 409); }
}

export function assetPath(id: string, name: string) {
  if (!/^[0-9a-f-]+\.(png|jpg|webp)$/i.test(name)) throw new VideoError("Ảnh không hợp lệ.");
  return path.join(jobDir(id), "images", name);
}

export async function storyboardView(id: string): Promise<StoryboardView> {
  const board = await loadStoryboard(id);
  return {
    title: board.title,
    scenes: board.scenes.map(({ imagePath, ...scene }) => ({
      ...scene,
      imageUrl: imagePath ? `/api/jobs/${id}/scenes/${scene.id}/image?v=${encodeURIComponent(imagePath)}` : undefined
    }))
  };
}

export function imageExtension(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw new VideoError("Chỉ nhận ảnh PNG, JPEG hoặc WebP.");
}

export async function saveImage(id: string, sceneId: string, file: File) {
  await requireJob(id);
  const unlock = await lockJob(id);
  try {
    const board = await loadStoryboard(id);
    const scene = board.scenes.find((item) => item.id === sceneId);
    if (!scene) throw new VideoError("Không tìm thấy cảnh.", 404);
    if (file.size === 0 || file.size > 10 * 1024 * 1024) throw new VideoError("Ảnh phải từ 1 byte đến 10 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const name = `${randomUUID()}.${imageExtension(bytes)}`;
    const target = assetPath(id, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    const previous = scene.imagePath;
    scene.imagePath = name;
    scene.imageSource = "USER_ASSET";
    await writeJson(path.join(jobDir(id), "storyboard.json"), board);
    await updateJob(id, { status: "IMAGES", progress: 60, error: undefined, outputPath: undefined, currentStep: "Ảnh đã lưu. Duyệt nội dung và render video." });
    if (previous) await fs.rm(assetPath(id, previous), { force: true });
    return storyboardView(id);
  } finally { await unlock(); }
}
