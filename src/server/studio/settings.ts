import path from "node:path";
import type { StudioSettings } from "@/core/contracts/studio-settings";
import { studioSettingsSchema } from "@/core/studio/studio.constant";
import { readJson, writeJson } from "@/server/filesystem/json-file";
import { tempRoot } from "@/server/filesystem/paths";

function settingsFile() { return process.env.STUDIO_SETTINGS_PATH || path.join(tempRoot, "studio-settings.json"); }

export async function getStudioSettings(): Promise<StudioSettings> {
  const defaults: StudioSettings = {
    comfyuiEnabled: process.env.ENABLE_COMFYUI === "true",
    comfyuiBaseUrl: process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188",
    comfyuiCheckpoint: process.env.COMFYUI_CHECKPOINT || "",
    vieneuBaseUrl: process.env.VIENEU_BASE_URL || "http://127.0.0.1:8000",
    vieneuModel: process.env.VIENEU_MODEL || "vieneu-v3-turbo",
    vieneuVoice: process.env.VIENEU_VOICE || "Hải Đăng",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "qwen2.5:7b"
  };
  try { return { ...defaults, ...await readJson<StudioSettings>(settingsFile()) }; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaults;
    throw error;
  }
}

export async function saveStudioSettings(input: unknown): Promise<StudioSettings> {
  const settings = await studioSettingsSchema.validate(input, { strict: true, abortEarly: false });
  await writeJson(settingsFile(), settings);
  return settings;
}
