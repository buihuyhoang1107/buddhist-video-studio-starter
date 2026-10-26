import { randomUUID } from "node:crypto";
import type { GeneratedContent, Storyboard, VideoProjectConfig } from "@/core/contracts/project";

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function createStoryboard(
  config: VideoProjectConfig,
  content: GeneratedContent
): Promise<Storyboard> {
  const sentences = splitSentences(`${content.hook}. ${content.story} ${content.lesson} ${content.gentleCta ?? ""}`);
  const sceneCount = Math.max(4, Math.min(10, sentences.length));
  const duration = Math.max(3, Math.round(config.durationSeconds / sceneCount));

  return {
    title: content.title,
    scenes: sentences.slice(0, 10).map((sentence) => ({
      id: randomUUID(),
      duration,
      narration: sentence,
      subtitle: sentence,
      visualPrompt: `${config.audience === "CHILD" ? "gentle Vietnamese children's story illustration" : "peaceful Vietnamese contemplative illustration"}, ${sentence}, vertical composition, warm light, no text in image`,
      imageSource: config.imageMode === "USER_UPLOAD" ? "USER_ASSET" : "GENERATE"
    }))
  };
}
