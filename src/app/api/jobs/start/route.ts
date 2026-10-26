import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { VideoProjectConfig } from "@/core/contracts/project";
import { createJob } from "@/server/jobs/job-repository";
import { generateVideo } from "@/core/workflow/generate-video";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = (await request.json()) as VideoProjectConfig;
  const jobId = randomUUID();
  const job = await createJob(jobId, config);

  // Fire-and-forget inside the local Next.js process. Good enough for the local V1 starter.
  // If jobs become persistent/remote/multi-user, replace this with a proper queue/backend.
  void generateVideo(jobId, config);

  return NextResponse.json(job, { status: 202 });
}
