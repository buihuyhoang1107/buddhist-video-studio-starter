import { NextResponse } from "next/server";
import { startRender } from "@/server/video/render";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return NextResponse.json(await startRender(id, body.approved === true, body.withoutVoice === true), { status: 202 });
  } catch (error) { return videoError(error); }
}
