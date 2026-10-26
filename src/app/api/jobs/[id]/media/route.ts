import { NextResponse } from "next/server";
import { saveMedia, removeMedia } from "@/server/video/media";
import { loadStoryboard, mediaPath, requireJob, VideoError } from "@/server/video/job-assets";
import { streamMedia } from "@/server/video/stream";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    if (Number(request.headers.get("content-length")) > 101 * 1024 * 1024) throw new VideoError("File tối đa 100 MB.", 413);
    const { id } = await context.params;
    await requireJob(id);
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new VideoError("Vui lòng chọn file.");
    return NextResponse.json(await saveMedia(id, String(data.get("kind")), file));
  } catch (error) { return videoError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await removeMedia(id, new URL(request.url).searchParams.get("kind") || ""));
  } catch (error) { return videoError(error); }
}

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await requireJob(id);
    const board = await loadStoryboard(id);
    const kind = new URL(request.url).searchParams.get("kind");
    const name = kind === "background" ? board.background?.path : kind === "audio" ? board.audio?.path : undefined;
    if (!name) throw new VideoError("Chưa có tài nguyên này.", 404);
    const extension = name.split(".").pop()!;
    const type: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", wav: "audio/wav" };
    return await streamMedia(request, mediaPath(id, name), type[extension]);
  } catch (error) { return videoError(error); }
}
