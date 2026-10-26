export interface StudioSettings {
  comfyuiEnabled: boolean;
  comfyuiBaseUrl: string;
  comfyuiCheckpoint: string;
  vieneuBaseUrl: string;
  vieneuModel: string;
  vieneuVoice: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
}

export interface LocalServiceStatus {
  ready: boolean;
  message: string;
}

export interface StudioVoice {
  id: string;
  name: string;
  description?: string;
}

export interface StudioStatus {
  settings: StudioSettings;
  comfyui: LocalServiceStatus;
  vieneu: LocalServiceStatus;
  ollama: LocalServiceStatus;
  checkpoints: string[];
  voices: StudioVoice[];
  ollamaModels: Array<{ name: string }>;
}

export type LocalServiceName = "comfyui" | "vieneu";
