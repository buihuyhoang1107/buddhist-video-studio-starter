import path from "node:path";
import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { outputRoot } from "@/server/filesystem/paths";
import { requireJob, VideoError } from "@/server/video/job-assets";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = await requireJob(id);
    if (job.status !== "COMPLETED" || !job.outputPath) throw new VideoError("Video chưa sẵn sàng.", 404);
    const file = path.join(outputRoot, `${id}.mp4`);
    const { size } = await fs.stat(file);
    const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
    if (new URL(request.url).searchParams.get("download") === "1") headers["Content-Disposition"] = `attachment; filename="${id}.mp4"`;
    let start = 0, end = size - 1, status = 200;
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      if (match[1]) { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1; }
      else start = Math.max(0, size - Number(match[2]));
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      status = 206;
    }
    headers["Content-Length"] = String(end - start + 1);
    return new Response(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream<Uint8Array>, { status, headers });
  } catch (error) { return videoError(error); }
}
