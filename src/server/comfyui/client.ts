export interface ComfyImage {
  filename: string;
  subfolder: string;
  type: string;
}

interface ComfyHistory {
  outputs: Record<string, { images?: ComfyImage[] }>;
  status: { completed: boolean; status_str: string; messages: Array<[string, { exception_message?: string }]> };
}

export class ComfyUiClient {
  constructor(private baseUrl = process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188") {}

  private async request(endpoint: string, signal: AbortSignal, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${endpoint}`, { ...init, signal });
    if (!response.ok) throw new Error(`ComfyUI HTTP ${response.status}: ${(await response.text()).slice(0, 1000)}`);
    return response;
  }

  async generate(prompt: Record<string, unknown>, outputNode: string, signal: AbortSignal): Promise<Buffer> {
    const submitted = await this.request("/prompt", signal, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt })
    });
    const result = await submitted.json() as { prompt_id?: string };
    if (!result.prompt_id) throw new Error("ComfyUI không trả prompt_id.");
    // Never interrupt other users' work on the shared server when this request times out.
    while (!signal.aborted) {
      const response = await this.request(`/history/${encodeURIComponent(result.prompt_id)}`, signal);
      const history = await response.json() as Record<string, ComfyHistory>;
      const entry = history[result.prompt_id];
      if (entry?.status.status_str === "error") {
        const failure = entry.status.messages.find(([kind]) => kind === "execution_error");
        throw new Error(`ComfyUI: ${failure?.[1].exception_message || "Workflow tạo ảnh thất bại."}`);
      }
      if (entry?.status.completed) {
        const image = entry.outputs[outputNode]?.images?.[0];
        if (!image) throw new Error(`ComfyUI không trả ảnh tại output node ${outputNode}.`);
        const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
        const download = await this.request(`/view?${query}`, signal);
        const reader = download.body?.getReader();
        if (!reader) throw new Error("ComfyUI trả ảnh rỗng.");
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.length;
            if (size > 10 * 1024 * 1024) throw new Error("Ảnh ComfyUI vượt giới hạn 10 MB.");
            chunks.push(chunk.value);
          }
        } finally { await reader.cancel(); }
        if (!size) throw new Error("ComfyUI trả ảnh rỗng.");
        return Buffer.concat(chunks);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
    signal.throwIfAborted();
    throw new Error("ComfyUI hết thời gian tạo ảnh.");
  }
}

export async function ensureComfyUiReachable() {
  const baseUrl = process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/system_stats`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`ComfyUI returned ${response.status}`);
  return true;
}
