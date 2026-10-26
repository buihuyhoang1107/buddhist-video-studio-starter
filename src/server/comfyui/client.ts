/**
 * ComfyUI adapter placeholder.
 * Codex 02 should bind this to a user-approved ComfyUI workflow JSON.
 * The core workflow must only call a provider interface, never ComfyUI directly.
 */
export async function ensureComfyUiReachable() {
  const baseUrl = process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188";
  const response = await fetch(`${baseUrl}/system_stats`);
  if (!response.ok) throw new Error(`ComfyUI returned ${response.status}`);
  return true;
}
