import path from "node:path";
import type { DharmaReview } from "@/core/contracts/project";
import { ComfyUiImageProvider } from "@/providers/image/comfyui-image-provider";
import { jobDir } from "@/server/filesystem/paths";
import { readJson, writeJson } from "@/server/filesystem/json-file";
import { updateJob } from "@/server/jobs/job-repository";
import { assetPath, loadStoryboard, lockJob, requireJob, storyboardView, VideoError } from "@/server/video/job-assets";
import { removeFile } from "@/server/filesystem/remove-file";
import { getStudioSettings } from "@/server/studio/settings";

export async function generateSceneImage(id: string, sceneId: string, replace = false) {
  await requireJob(id);
  if (!(await getStudioSettings()).comfyuiEnabled) throw new VideoError("Bật ComfyUI và lưu trong Cấu hình dịch vụ trên giao diện.", 409);
  const unlock = await lockJob(id);
  let generated: string | undefined;
  let committed = false;
  try {
    const review = await readJson<DharmaReview>(path.join(jobDir(id), "dharma-review.json"));
    if (!review.approved) throw new VideoError("Nội dung chưa vượt qua Dharma Review.", 409);
    const board = await loadStoryboard(id);
    const scene = board.scenes.find((item) => item.id === sceneId);
    if (!scene) throw new VideoError("Không tìm thấy cảnh.", 404);
    if (scene.imagePath && !replace) throw new VideoError("Cảnh đã có ảnh. Truyền replace=true nếu muốn thay ảnh này.", 409);
    if (!scene.visualPrompt) throw new VideoError("Cảnh chưa có visualPrompt.", 409);
    const previous = scene.imagePath;
    try {
      const image = await new ComfyUiImageProvider().generate({ jobId: id, sceneId, prompt: scene.visualPrompt });
      generated = image.path;
    } catch (error) {
      throw new VideoError(`Tạo ảnh thất bại; ảnh cũ được giữ. ${error instanceof Error ? error.message : "Kiểm tra ComfyUI và thử lại."}`, 502);
    }
    scene.imagePath = path.basename(generated);
    scene.imageSource = "GENERATE";
    await writeJson(path.join(jobDir(id), "storyboard.json"), board);
    committed = true;
    await updateJob(id, { status: "IMAGES", progress: 60, error: undefined, outputPath: undefined, currentStep: "Đã tạo ảnh ComfyUI. Duyệt ảnh trước khi render." });
    if (previous) await removeFile(assetPath(id, previous));
    return storyboardView(id);
  } finally {
    if (generated && !committed) await removeFile(generated);
    await unlock();
  }
}
