import path from "node:path";
import type { DharmaReview } from "@/core/contracts/project";
import { jobDir } from "@/server/filesystem/paths";
import { readJson } from "@/server/filesystem/json-file";
import { updateJob } from "@/server/jobs/job-repository";
import { prepareNarration } from "./audio";
import { loadStoryboard, lockJob, requireJob, storyboardView, VideoError } from "./job-assets";

export async function previewNarration(id: string) {
  const job = await requireJob(id);
  const unlock = await lockJob(id);
  try {
    const review = await readJson<DharmaReview>(path.join(jobDir(id), "dharma-review.json"));
    if (!review.approved) throw new VideoError("Nội dung chưa vượt qua Dharma Review.", 409);
    const board = await loadStoryboard(id);
    if (!board.scenes.length) throw new VideoError("Chưa có lời kể để tạo giọng đọc.", 409);
    if (board.audio?.provider === "USER_AUDIO") throw new VideoError("Đang dùng audio bạn upload. Bỏ audio này trước nếu muốn tạo giọng VieNeu.", 409);
    try {
      await prepareNarration(id, board, job.config);
      await updateJob(id, { status: "IMAGES", progress: 60, error: undefined, outputPath: undefined, currentStep: "Giọng đọc đã sẵn sàng. Nghe và duyệt trước khi tạo video." });
    } catch (error) {
      await updateJob(id, { status: "IMAGES", progress: 60, currentStep: "Chưa tạo được giọng đọc. Có thể thử lại hoặc upload audio." });
      throw new VideoError(error instanceof Error ? error.message : "Không tạo được giọng đọc.", 502);
    }
    return storyboardView(id);
  } finally { await unlock(); }
}
