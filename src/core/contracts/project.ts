export type Audience = "CHILD" | "SENIOR" | "GENERAL";
export type ContentMode = "AI_GENERATE" | "USER_STORY" | "REFERENCE_LIBRARY";
export type ImageMode = "AI_GENERATE" | "USER_UPLOAD" | "MIXED";
export type VoiceMode = "LOCAL_TTS" | "USER_AUDIO" | "NONE";
export type MediaMode = "IMAGE_VIDEO" | "LOCAL_GENERATIVE_VIDEO";
export type SourceStatus = "VERIFIED" | "INTERPRETATION" | "STORY" | "UNKNOWN";

export interface VideoProjectConfig {
  title: string;
  audience: Audience;
  contentMode: ContentMode;
  imageMode: ImageMode;
  voiceMode: VoiceMode;
  mediaMode: MediaMode;
  durationSeconds: number;
  theme?: string;
  story?: string;
  referenceStoryIds?: string[];
}

export interface GeneratedContent {
  title: string;
  hook: string;
  story: string;
  lesson: string;
  gentleCta?: string;
  sourceStatus: SourceStatus;
  sourceReferences?: string[];
}

export interface DharmaReview {
  approved: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export type SceneImageSource = "GENERATE" | "USER_ASSET";

export interface Scene {
  id: string;
  duration: number;
  narration: string;
  subtitle: string;
  visualPrompt?: string;
  imageSource: SceneImageSource;
  imagePath?: string;
}

export interface Storyboard {
  title: string;
  scenes: Scene[];
}
