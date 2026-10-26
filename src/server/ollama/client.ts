import { getStudioSettings } from "@/server/studio/settings";

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  format?: "json";
  stream?: boolean;
}

export async function ollamaGenerate<T>(prompt: string): Promise<T> {
  const settings = await getStudioSettings();
  const baseUrl = settings.ollamaBaseUrl.replace(/\/$/, "");
  const model = settings.ollamaModel;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, format: "json", stream: false } satisfies OllamaGenerateRequest)
    });
  } catch (cause) {
    throw new Error(
      `Không kết nối được Ollama tại ${baseUrl}. Kiểm tra Ollama đã cài và đang chạy (ollama serve), cùng OLLAMA_BASE_URL trong .env.local. Nếu chưa dùng AI, chọn "Tôi nhập truyện".`,
      { cause }
    );
  }

  if (!response.ok) {
    const details = await response.text();
    const hint = response.status === 404
      ? ` Kiểm tra model bằng "ollama list"; nếu chưa có, chạy "ollama pull ${model}". Kiểm tra OLLAMA_MODEL và OLLAMA_BASE_URL trong .env.local.`
      : "";
    throw new Error(`Ollama trả về HTTP ${response.status}.${hint} ${details.slice(0, 1000)}`);
  }

  const body = (await response.json()) as { response?: string };
  if (!body.response) throw new Error("Ollama response is empty");
  return JSON.parse(body.response) as T;
}
