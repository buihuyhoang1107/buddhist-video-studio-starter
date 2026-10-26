import { NextResponse } from "next/server";
import { generateSceneImage } from "@/server/comfyui/generate-scene";
import { VideoError } from "@/server/video/job-assets";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
interface Context { params: Promise<{ id: string; sceneId: string }> }

export async function POST(request: Request, context: Context) {
  try {
    let body: { replace?: boolean };
    try { body = await request.json(); }
    catch { throw new VideoError("Body phải là JSON object."); }
    if (!body || typeof body !== "object" || Array.isArray(body) || (body.replace !== undefined && typeof body.replace !== "boolean")) {
      throw new VideoError("replace phải là boolean.");
    }
    const { id, sceneId } = await context.params;
    return NextResponse.json(await generateSceneImage(id, sceneId, body.replace === true));
  } catch (error) { return videoError(error); }
}
