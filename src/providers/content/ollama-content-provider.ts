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
Create a short Buddhist-inspired educational story in Vietnamese.
Audience: ${config.audience}
Theme: ${config.theme ?? config.title}
Target duration: ${config.durationSeconds} seconds
Rules: ${audienceRule}
Do not fabricate a quote from the Buddha. If not using a verified scripture source, sourceStatus must be STORY or INTERPRETATION.
Return JSON only with: title, hook, story, lesson, gentleCta, sourceStatus, sourceReferences.
`;

    return ollamaGenerate<GeneratedContent>(prompt);
  }
}
