import { randomUUID } from "node:crypto";
import type { GeneratedContent, Storyboard, VideoProjectConfig } from "@/core/contracts/project";
import { estimateDuration, fitAudioDuration, splitNarration } from "@/core/narration/timing";

export async function createStoryboard(
  config: VideoProjectConfig,
  content: GeneratedContent
): Promise<Storyboard> {
  const sentences = splitNarration(content.story);
  if (!sentences.length) throw new Error("Nội dung truyện không được để trống.");

  const board: Storyboard = {
    title: content.title,
    scenes: sentences.map((sentence) => ({
      id: randomUUID(),
      duration: estimateDuration(sentence, config.audience),
      narration: sentence,
      subtitle: sentence,
      visualPrompt: `${config.audience === "CHILD" ? "gentle Vietnamese children's story illustration" : "peaceful Vietnamese contemplative illustration"}, ${sentence}, vertical composition, warm light, no text in image`,
      imageSource: config.imageMode === "USER_UPLOAD" ? "USER_ASSET" : "GENERATE"
    }))
  };
  if (config.durationMode === "TARGET") fitAudioDuration(board.scenes, config.durationSeconds);
  return board;
}
