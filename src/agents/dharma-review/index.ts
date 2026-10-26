import type { DharmaReview, GeneratedContent, VideoProjectConfig } from "@/core/contracts/project";

const forbiddenPatterns: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /nếu.*không.*(niệm phật|làm phước).*sẽ.*(gặp|bị)/i, message: "Fear/coercion pattern detected." },
  { pattern: /(chữa khỏi|chữa bệnh|thay thế thuốc|không cần bác sĩ)/i, message: "Potential medical claim detected." },
  { pattern: /(chuyển tiền|đóng tiền|cúng tiền).*để.*(hết nghiệp|được phước)/i, message: "Potential financial/spiritual coercion detected." }
];

export async function reviewDharma(
  config: VideoProjectConfig,
  content: GeneratedContent
): Promise<DharmaReview> {
  const issues: string[] = [];
  const combined = `${content.hook}\n${content.story}\n${content.lesson}\n${content.gentleCta ?? ""}`;

  for (const item of forbiddenPatterns) {
    if (item.pattern.test(combined)) issues.push(item.message);
  }

  if (content.sourceStatus === "UNKNOWN") {
    issues.push("Source status is UNKNOWN.");
  }

  if (config.audience === "CHILD" && /(địa ngục|máu me|ma quỷ|trừng phạt)/i.test(combined)) {
    issues.push("Child content contains frightening imagery or punishment language.");
  }

  const score = Math.max(0, 100 - issues.length * 25);
  return {
    approved: issues.length === 0 && score >= 85,
    score,
    issues,
    suggestions: issues.length ? ["Rewrite the flagged passages using calm, non-coercive language."] : []
  };
}
