import { NextResponse } from "next/server";
import { requireJob, storyboardView } from "@/server/video/job-assets";
import { videoError } from "@/server/video/http";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireJob(id);
    return NextResponse.json(await storyboardView(id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return videoError(error); }
}
