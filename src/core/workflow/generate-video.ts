import path from "node:path";
import type { VideoProjectConfig } from "@/core/contracts/project";
import { jobDir } from "@/server/filesystem/paths";
import { writeJson } from "@/server/filesystem/json-file";
import { updateJob } from "@/server/jobs/job-repository";
import { UserStoryProvider } from "@/providers/content/user-story-provider";
import { OllamaContentProvider } from "@/providers/content/ollama-content-provider";
import { reviewDharma } from "@/agents/dharma-review";
import { createStoryboard } from "@/agents/storyboard";

function getContentProvider(config: VideoProjectConfig) {
  if (config.contentMode === "USER_STORY") return new UserStoryProvider();
  if (config.contentMode === "AI_GENERATE") return new OllamaContentProvider();
  throw new Error("REFERENCE_LIBRARY provider is not implemented yet. See CODEX_BACKLOG.md");
}

export async function generateVideo(jobId: string, config: VideoProjectConfig) {
  try {
    await updateJob(jobId, { status: "CONTENT", progress: 10, currentStep: "Preparing content" });
    const content = await getContentProvider(config).generate(config);
    await writeJson(path.join(jobDir(jobId), "content.json"), content);

    await updateJob(jobId, { status: "DHARMA_REVIEW", progress: 30, currentStep: "Dharma review" });
    const review = await reviewDharma(config, content);
    await writeJson(path.join(jobDir(jobId), "dharma-review.json"), review);
    if (!review.approved) throw new Error(`Dharma review failed: ${review.issues.join("; ")}`);

    await updateJob(jobId, { status: "STORYBOARD", progress: 50, currentStep: "Creating storyboard" });
    const storyboard = await createStoryboard(config, content);
    await writeJson(path.join(jobDir(jobId), "storyboard.json"), storyboard);

    await updateJob(jobId, {
      status: "IMAGES",
      progress: 60,
      currentStep: "Chờ bạn duyệt nội dung và upload ảnh cho từng cảnh"
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "FAILED",
      progress: 100,
      currentStep: "Failed",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
