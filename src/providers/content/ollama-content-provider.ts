import type { ContentProvider } from "@/core/providers/content-provider";
import type { GeneratedContent, VideoProjectConfig } from "@/core/contracts/project";
import { ollamaGenerate } from "@/server/ollama/client";

export class OllamaContentProvider implements ContentProvider {
  async generate(config: VideoProjectConfig): Promise<GeneratedContent> {
    const audienceRule = config.audience === "CHILD"
      ? "Use simple Vietnamese, one gentle moral lesson, no fear, threats, hell imagery, coercion or superstition."
      : config.audience === "SENIOR"
        ? "Use slow, respectful, calm Vietnamese. Focus on compassion, gratitude, peace and mindfulness. Do not replace medical advice."
        : "Use gentle, respectful Vietnamese.";

    const prompt = `
Create a coherent Buddhist-inspired educational story in Vietnamese, suitable for continuous spoken narration.
Audience: ${config.audience}
Theme: ${config.theme ?? config.title}
Length guidance: ${config.storyLength === "LONG" ? "700-1000" : config.storyLength === "SHORT" ? "100-200" : "300-500"} Vietnamese space-separated syllables. Complete the plot naturally; do not force a fixed duration.
Put the ENTIRE spoken text (opening, connected events, and ending) in story, in reading order.
Do not use headings, bullet points, scene labels or repeated introductions. Each passage flows into the next.
Embed the gentle lesson naturally in the story. hook, lesson, gentleCta are optional metadata, not additional spoken text.
Rules: ${audienceRule}
Do not fabricate a quote from the Buddha. If not using a verified scripture source, sourceStatus must be STORY or INTERPRETATION.
Return JSON only with: title, hook, story, lesson, gentleCta, sourceStatus, sourceReferences.
`;

    return ollamaGenerate<GeneratedContent>(prompt);
  }
}
