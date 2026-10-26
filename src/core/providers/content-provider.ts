import type { GeneratedContent, VideoProjectConfig } from "@/core/contracts/project";

export interface ContentProvider {
  generate(config: VideoProjectConfig): Promise<GeneratedContent>;
}
