import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { assetPath, loadStoryboard, requireJob, saveImage, VideoError } from "@/server/video/job-assets";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; sceneId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) throw new VideoError("Ảnh tối đa 10 MB.", 413);
    const { id, sceneId } = await context.params;
    await requireJob(id);
    const data = await request.formData();
    const image = data.get("image");
    if (!(image instanceof File)) throw new VideoError("Vui lòng chọn ảnh.");
    return NextResponse.json(await saveImage(id, sceneId, image));
  } catch (error) { return videoError(error); }
}

export async function GET(_request: Request, context: Context) {
  try {
    const { id, sceneId } = await context.params;
    await requireJob(id);
    const scene = (await loadStoryboard(id)).scenes.find((item) => item.id === sceneId);
    if (!scene?.imagePath) throw new VideoError("Chưa có ảnh cho cảnh này.", 404);
    const image = await fs.readFile(assetPath(id, scene.imagePath));
    const type = scene.imagePath.endsWith("png") ? "image/png" : scene.imagePath.endsWith("webp") ? "image/webp" : "image/jpeg";
    return new Response(new Uint8Array(image), { headers: { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return videoError(error); }
}
