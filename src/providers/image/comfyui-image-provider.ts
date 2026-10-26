import path from "node:path";
import { promises as fs } from "node:fs";
import { randomInt, randomUUID } from "node:crypto";
import type { ImageAsset, ImageGenerationRequest, ImageProvider } from "@/core/providers/image-provider";
import { ComfyUiClient } from "@/server/comfyui/client";
import { assetPath, imageExtension } from "@/server/video/job-assets";
import { runFfmpeg } from "@/server/ffmpeg/run";
import { removeFile } from "@/server/filesystem/remove-file";
import { getStudioSettings } from "@/server/studio/settings";

export class ComfyUiImageProvider implements ImageProvider {
  async generate(request: ImageGenerationRequest): Promise<ImageAsset> {
    const settings = await getStudioSettings();
    if (request.referenceImagePaths?.length) throw new Error("Workflow hiện tại chỉ tạo ảnh từ prompt; chưa hỗ trợ ảnh tham chiếu.");
    const file = process.env.COMFYUI_WORKFLOW || path.join(process.cwd(), "workflows", "comfyui-text-to-image.json");
    const template = await fs.readFile(file, "utf8");
    if (!template.includes('"{{PROMPT}}"')) throw new Error("Workflow API cần placeholder {{PROMPT}}.");
    if (template.includes('"{{CHECKPOINT}}"') && !settings.comfyuiCheckpoint) {
      throw new Error("Chọn checkpoint ComfyUI trong Cấu hình dịch vụ trên giao diện.");
    }
    const prompt = JSON.parse(template, (_key, value: unknown) => {
      if (value === "{{PROMPT}}") return request.prompt;
      if (value === "{{CHECKPOINT}}") return settings.comfyuiCheckpoint;
      if (value === "{{SEED}}") return randomInt(0, 2 ** 48 - 1);
      return value;
    }) as Record<string, unknown>;
    if (!prompt || Array.isArray(prompt) || typeof prompt !== "object" || "nodes" in prompt) {
      throw new Error("Dùng workflow API format của ComfyUI, không dùng workflow giao diện có nodes/links.");
    }
    const bytes = await new ComfyUiClient(settings.comfyuiBaseUrl).generate(prompt, process.env.COMFYUI_OUTPUT_NODE || "9", AbortSignal.timeout(600000));
    const target = assetPath(request.jobId, `${randomUUID()}.${imageExtension(bytes)}`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      await fs.writeFile(target, bytes);
      await runFfmpeg(["-v", "error", "-xerror", "-i", target, "-frames:v", "1", "-f", "null", "-"]);
      return { path: target, provider: "COMFYUI" };
    } catch (error) {
      await removeFile(target);
      throw error;
    }
  }
}
