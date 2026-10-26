import type { VideoProjectConfig } from "./project";

export type JobStatus =
  | "CREATED"
  | "CONTENT"
  | "DHARMA_REVIEW"
  | "STORYBOARD"
  | "IMAGES"
  | "VOICE"
  | "RENDERING"
  | "QA"
  | "COMPLETED"
  | "FAILED";

export interface GenerationJob {
  id: string;
  config: VideoProjectConfig;
  status: JobStatus;
  progress: number;
  currentStep?: string;
  outputPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
