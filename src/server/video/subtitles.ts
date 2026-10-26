function timestamp(seconds: number) {
  const total = Math.round(seconds * 100);
  return `${Math.floor(total / 360000)}:${String(Math.floor(total / 6000) % 60).padStart(2, "0")}:${String(Math.floor(total / 100) % 60).padStart(2, "0")}.${String(total % 100).padStart(2, "0")}`;
}

export function sceneSubtitles(text: string, duration: number, senior: boolean, offset = 0) {
  // Escape ASS control syntax before adding intentional line breaks.
  const clean = text.replace(/[\\{}]/g, "").replace(/\s+/g, " ").trim();
  const lines: string[] = [];
  for (const word of clean.split(" ")) {
    if (!lines.length || lines[lines.length - 1].length + word.length + 1 > 30) lines.push(word);
    else lines[lines.length - 1] += ` ${word}`;
  }
  // Page long subtitles to keep text inside the portrait safe area.
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3).join("\\N"));
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${senior ? 64 : 56},&H00FFFFFF,&H00FFFFFF,&H00202020,&H90000000,0,0,0,0,100,100,0,0,3,3,0,2,85,85,180,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${pages.map((page, i) => `Dialogue: 0,${timestamp(offset + i * duration / pages.length)},${timestamp(offset + (i + 1) * duration / pages.length)},Default,,0,0,0,,${page}`).join("\n")}
`;
}

export function storySubtitles(scenes: Array<{ subtitle: string; duration: number }>, senior: boolean) {
  const header = sceneSubtitles("", 1, senior).split("Dialogue:")[0];
  let offset = 0;
  const events = scenes.flatMap((scene) => {
    const lines = sceneSubtitles(scene.subtitle, scene.duration, senior, offset).split("\n").filter(line => line.startsWith("Dialogue:"));
    offset += scene.duration;
    return lines;
  });
  return header + events.join("\n") + "\n";
}
