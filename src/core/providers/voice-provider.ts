export interface VoiceConfig {
  audience: "CHILD" | "SENIOR" | "GENERAL";
  speed?: number;
  tone?: string;
}

export interface AudioAsset {
  path: string;
  provider: string;
}

export interface VoiceProvider {
  generate(text: string, config: VoiceConfig): Promise<AudioAsset>;
}
