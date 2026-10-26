import path from "node:path";
import { outputRoot } from "@/server/filesystem/paths";
import { requireJob, VideoError } from "@/server/video/job-assets";
import { videoError } from "@/server/video/http";
import { streamMedia } from "@/server/video/stream";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = await requireJob(id);
    if (job.status !== "COMPLETED" || !job.outputPath) throw new VideoError("Video chưa sẵn sàng.", 404);
    const file = path.join(outputRoot, `${id}.mp4`);
    return await streamMedia(request, file, "video/mp4", new URL(request.url).searchParams.get("download") === "1" ? `${id}.mp4` : undefined);
  } catch (error) { return videoError(error); }
}
