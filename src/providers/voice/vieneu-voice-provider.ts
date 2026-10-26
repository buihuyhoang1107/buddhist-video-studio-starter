import path from "node:path";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import type { VoiceConfig, VoiceProvider, AudioAsset } from "@/core/providers/voice-provider";

export class VieneuVoiceProvider implements VoiceProvider {
  constructor(private directory: string) {}

  fingerprint() {
    return JSON.stringify([process.env.VIENEU_BASE_URL || "http://127.0.0.1:8000", process.env.VIENEU_MODEL || "vieneu-v3-turbo", process.env.VIENEU_VOICE || "Hải Đăng"]);
  }

  async generate(text: string, _config: VoiceConfig): Promise<AudioAsset> {
    const base = (process.env.VIENEU_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    let response: Response;
    try {
      response = await fetch(`${base}/v1/audio/speech`, {
        method: "POST",
        signal: AbortSignal.timeout(180000),
        headers: { "Content-Type": "application/json", ...(process.env.VIENEU_API_KEY ? { Authorization: `Bearer ${process.env.VIENEU_API_KEY}` } : {}) },
        body: JSON.stringify({ model: process.env.VIENEU_MODEL || "vieneu-v3-turbo", voice: process.env.VIENEU_VOICE || "Hải Đăng", input: text, response_format: "wav" })
      });
    } catch (cause) {
      throw new Error(`Không kết nối được TTS local tại ${base}. Khởi động VieNeu bằng "uv run python -m apps.openai_speech" trong repo VieNeu-TTS, hoặc upload audio. Xem docs/NARRATION_SETUP.md.`, { cause });
    }
    if (!response.ok) throw new Error(`VieNeu TTS HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error("TTS trả về audio rỗng hoặc quá lớn cho một đoạn.");
    await fs.mkdir(this.directory, { recursive: true });
    const file = path.join(this.directory, `${randomUUID()}.wav`);
    await fs.writeFile(file, bytes);
    return { path: file, provider: "LOCAL_TTS" };
  }
}
