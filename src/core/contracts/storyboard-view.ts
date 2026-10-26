import type { Scene } from "./project";

export interface StoryboardView {
  title: string;
  scenes: Array<Omit<Scene, "imagePath"> & { imageUrl?: string }>;
}
