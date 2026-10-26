import { NextResponse } from "next/server";
import { previewNarration } from "@/server/video/preview-narration";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
interface Context { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context) {
  try { return NextResponse.json(await previewNarration((await context.params).id)); }
  catch (error) { return videoError(error); }
}
