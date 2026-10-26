import type { Scene } from "./project";

export interface StoryboardView {
  title: string;
  scenes: Array<Omit<Scene, "imagePath"> & { imageUrl?: string }>;
  background?: { kind: "IMAGE" | "VIDEO"; url: string };
  audio?: { url: string; provider: "USER_AUDIO" | "LOCAL_TTS"; durationSeconds: number; timing: "MEASURED_SEGMENTS" | "ESTIMATED_SEGMENTS" };
}
