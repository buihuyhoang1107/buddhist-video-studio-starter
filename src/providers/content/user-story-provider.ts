import type { ContentProvider } from "@/core/providers/content-provider";
import type { GeneratedContent, VideoProjectConfig } from "@/core/contracts/project";

export class UserStoryProvider implements ContentProvider {
  async generate(config: VideoProjectConfig): Promise<GeneratedContent> {
    if (!config.story?.trim()) {
      throw new Error("USER_STORY mode requires story text");
    }

    return {
      title: config.title,
      hook: "",
      story: config.story.trim(),
      lesson: "",
      sourceStatus: "STORY"
    };
  }
}
