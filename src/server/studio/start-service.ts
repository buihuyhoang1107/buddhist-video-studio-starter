import path from "node:path";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import type { LocalServiceName } from "@/core/contracts/studio-settings";
import { getStudioSettings } from "./settings";
import { tempRoot } from "@/server/filesystem/paths";
import { VideoError } from "@/server/video/job-assets";

export async function startLocalService(name: LocalServiceName) {
  const settings = await getStudioSettings();
  const comfy = name === "comfyui";
  const base = new URL(comfy ? settings.comfyuiBaseUrl : settings.vieneuBaseUrl);
  if (!["127.0.0.1", "localhost"].includes(base.hostname) || base.protocol !== "http:") {
    throw new VideoError("Nút khởi động chỉ dùng cho dịch vụ HTTP tại 127.0.0.1 hoặc localhost.");
  }
  const prefix = comfy ? "COMFYUI" : "VIENEU";
  const repo = process.env[`${prefix}_REPO`] || path.resolve(process.cwd(), "..", comfy ? "ComfyUI" : "VieNeu-TTS");
  const python = process.env[`${prefix}_PYTHON`] || path.join(repo, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  try { await fs.access(python); }
  catch { throw new VideoError(`Chưa có môi trường Python cho ${comfy ? "ComfyUI" : "VieNeu"}. Cần cài dependency lần đầu theo hướng dẫn thiết lập; sau đó có thể khởi động tại đây.`, 409); }
  // A filesystem lock also covers double clicks and multiple browser tabs.
  await fs.mkdir(tempRoot, { recursive: true });
  const lock = path.join(tempRoot, `${name}-startup.lock`);
  let handle;
  for (let attempt = 0; ; attempt++) {
    try { handle = await fs.open(lock, "wx"); break; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (attempt || Date.now() - (await fs.stat(lock)).mtimeMs < 15000) throw new VideoError("Đã gửi yêu cầu khởi động. Chờ dịch vụ sẵn sàng rồi kiểm tra lại.", 409);
      await fs.unlink(lock);
    }
  }
  let log;
  try {
    log = await fs.open(path.join(tempRoot, `${name}-service.log`), "w");
    const child = spawn(process.execPath, [path.join(process.cwd(), "scripts", comfy ? "start-comfyui.cjs" : "start-vieneu.cjs")], {
      cwd: process.cwd(), detached: true, windowsHide: true, stdio: ["ignore", log.fd, log.fd],
      env: { ...process.env, [`${prefix}_BASE_URL`]: base.toString(), [`${prefix}_PYTHON`]: python }
    });
    await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    child.unref();
    return { message: "Đã gửi yêu cầu khởi động. Model có thể cần thời gian tải; bấm Kiểm tra lại để cập nhật." };
  } finally {
    await log?.close();
    await handle.close();
    // Only protects startup requests; the AI server owns its port after startup.
    setTimeout(() => { fs.unlink(lock).catch(() => {}); }, 15000).unref();
  }
}
