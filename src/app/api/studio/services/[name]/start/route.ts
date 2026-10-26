import { NextResponse } from "next/server";
import { startLocalService } from "@/server/studio/start-service";
import { VideoError } from "@/server/video/job-assets";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
interface Context { params: Promise<{ name: string }> }

export async function POST(_request: Request, context: Context) {
  try {
    const { name } = await context.params;
    if (name !== "comfyui" && name !== "vieneu") throw new VideoError("Dịch vụ không hợp lệ.");
    return NextResponse.json(await startLocalService(name), { status: 202 });
  } catch (error) { return videoError(error); }
}
