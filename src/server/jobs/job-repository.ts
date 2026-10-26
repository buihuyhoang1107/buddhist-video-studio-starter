import { promises as fs } from "node:fs";
import path from "node:path";
import type { GenerationJob, JobStatus } from "@/core/contracts/job";
import type { VideoProjectConfig } from "@/core/contracts/project";
import { jobDir } from "@/server/filesystem/paths";
import { readJson, writeJson } from "@/server/filesystem/json-file";

function jobFile(jobId: string) {
  return path.join(jobDir(jobId), "job.json");
}

export async function createJob(id: string, config: VideoProjectConfig): Promise<GenerationJob> {
  const now = new Date().toISOString();
  const job: GenerationJob = {
    id,
    config,
    status: "CREATED",
    progress: 0,
    createdAt: now,
    updatedAt: now
  };

  await fs.mkdir(jobDir(id), { recursive: true });
  await writeJson(jobFile(id), job);
  return job;
}

export async function getJob(jobId: string): Promise<GenerationJob | null> {
  try {
    return await readJson<GenerationJob>(jobFile(jobId));
  } catch {
    return null;
  }
}

export async function updateJob(
  jobId: string,
  patch: Partial<Pick<GenerationJob, "progress" | "currentStep" | "outputPath" | "error">> & { status?: JobStatus }
): Promise<GenerationJob> {
  const current = await getJob(jobId);
  if (!current) throw new Error(`Job ${jobId} not found`);

  const next: GenerationJob = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  await writeJson(jobFile(jobId), next);
  return next;
}
