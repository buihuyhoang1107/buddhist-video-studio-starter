import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export async function runFfmpeg(args: string[], cwd?: string, timeout = 180000): Promise<void> {
  const configured = process.env.FFMPEG_PATH;
  const executable = configured && configured !== "ffmpeg" ? configured : ffmpegPath ?? "ffmpeg";

  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, ["-nostdin", ...args], { cwd, stdio: ["ignore", "ignore", "pipe"], windowsHide: true, timeout });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr = (stderr + String(chunk)).slice(-8000);
    });

    child.on("error", (cause) => reject(new Error("Không chạy được FFmpeg. Chạy npm install hoặc kiểm tra FFMPEG_PATH trong .env.local.", { cause })));
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-4000)}`));
    });
  });
}
