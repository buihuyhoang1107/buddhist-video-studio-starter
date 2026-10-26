import type { StudioStatus, StudioVoice } from "@/core/contracts/studio-settings";
import { getStudioSettings } from "./settings";

async function serviceJson<T>(base: string, endpoint: string, headers?: HeadersInit): Promise<T> {
  const response = await fetch(`${base.replace(/\/$/, "")}${endpoint}`, { headers, signal: AbortSignal.timeout(5000), cache: "no-store" });
  if (!response.ok) throw new Error(`Dịch vụ trả HTTP ${response.status}. Kiểm tra địa chỉ và trạng thái dịch vụ.`);
  return response.json();
}

export async function studioStatus(): Promise<StudioStatus> {
  const settings = await getStudioSettings();
  const headers = process.env.VIENEU_API_KEY ? { Authorization: `Bearer ${process.env.VIENEU_API_KEY}` } : undefined;
  const [comfyui, vieneu, ollama] = await Promise.allSettled([
    serviceJson<Record<string, { input: { required: { ckpt_name: [string[]] } } }>>(settings.comfyuiBaseUrl, "/object_info/CheckpointLoaderSimple"),
    serviceJson<{ data: StudioVoice[] }>(settings.vieneuBaseUrl, "/v1/voices", headers),
    serviceJson<{ models: Array<{ name: string }> }>(settings.ollamaBaseUrl, "/api/tags")
  ]);
  return {
    settings,
    comfyui: comfyui.status === "fulfilled" ? { ready: true, message: "ComfyUI đã kết nối. Chọn checkpoint để tạo ảnh." } : { ready: false, message: "Chưa kết nối được ComfyUI. Khởi động dịch vụ hoặc kiểm tra địa chỉ đã lưu." },
    vieneu: vieneu.status === "fulfilled" ? { ready: true, message: "VieNeu đã kết nối. Có thể tạo và nghe lời kể." } : { ready: false, message: "Chưa kết nối được VieNeu. Bạn vẫn có thể upload audio hoặc chọn video không giọng đọc." },
    ollama: ollama.status === "fulfilled" ? { ready: true, message: "Ollama đã kết nối." } : { ready: false, message: "Chưa kết nối được Ollama. Bạn vẫn có thể nhập truyện của mình." },
    checkpoints: comfyui.status === "fulfilled" ? comfyui.value.CheckpointLoaderSimple.input.required.ckpt_name[0] : [],
    voices: vieneu.status === "fulfilled" ? vieneu.value.data : [],
    ollamaModels: ollama.status === "fulfilled" ? ollama.value.models : []
  };
}
