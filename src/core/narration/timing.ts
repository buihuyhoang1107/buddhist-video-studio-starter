import type { Audience, Scene } from "@/core/contracts/project";

export function textWeight(text: string) {
  return Math.max(1, text.trim().split(/\s+/u).filter(Boolean).length);
}

export function estimateDuration(text: string, audience: Audience) {
  const syllablesPerSecond = audience === "SENIOR" ? 2.5 : audience === "CHILD" ? 2.8 : 3.2;
  return Math.max(0.5, textWeight(text) / syllablesPerSecond);
}

export function splitNarration(text: string) {
  const sentences = text.trim().split(/(?<=[.!?…])\s+/u).filter(Boolean);
  const segments: string[] = [];
  for (const sentence of sentences) {
    let current = "";
    for (const word of sentence.split(/\s+/u)) {
      if (current && current.length + word.length + 1 > 260) { segments.push(current); current = ""; }
      current = current ? `${current} ${word}` : word;
    }
    if (current) segments.push(current);
  }
  return segments;
}

export function fitAudioDuration(scenes: Scene[], seconds: number) {
  const weights = scenes.map((scene) => textWeight(scene.narration));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let elapsed = 0;
  scenes.forEach((scene, index) => {
    scene.duration = index === scenes.length - 1 ? seconds - elapsed : seconds * weights[index] / total;
    elapsed += scene.duration;
  });
}
