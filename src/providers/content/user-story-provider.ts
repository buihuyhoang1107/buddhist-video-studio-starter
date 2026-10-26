import type { ContentProvider } from "@/core/providers/content-provider";
import type { GeneratedContent, VideoProjectConfig } from "@/core/contracts/project";

export class UserStoryProvider implements ContentProvider {
  async generate(config: VideoProjectConfig): Promise<GeneratedContent> {
    if (!config.story?.trim()) {
      throw new Error("USER_STORY mode requires story text");
    }

    return {
      title: config.title,
      hook: config.theme ?? config.title,
      story: config.story.trim(),
      lesson: config.theme ?? "Bài học nhẹ nhàng từ câu chuyện.",
      gentleCta: config.audience === "CHILD"
        ? "Hôm nay con thử làm một việc tốt nhỏ nhé."
        : "Hôm nay mình thử dành một phút để bình tâm và quan sát chính mình.",
      sourceStatus: "STORY"
    };
  }
}
