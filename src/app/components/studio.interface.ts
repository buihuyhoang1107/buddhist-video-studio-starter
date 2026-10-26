import type { GenerationJob } from "@/core/contracts/job";
import type { StoryboardView } from "@/core/contracts/storyboard-view";
import type { StudioStatus } from "@/core/contracts/studio-settings";
import type { VoiceMode } from "@/core/contracts/project";

export interface StoryboardWorkspaceProps {
  job: GenerationJob;
  onJob: (job: GenerationJob) => void;
  onBusyChange: (busy: boolean) => void;
  services?: StudioStatus;
}

export interface StoryboardWorkspaceState {
  board?: StoryboardView;
  error: string;
  action: string;
  busy: boolean;
  rendering: boolean;
  approved: boolean;
  setApproved: (approved: boolean) => void;
  voiceMode: VoiceMode;
  setVoiceMode: (mode: VoiceMode) => void;
  media: (kind: "background" | "audio", file?: File) => Promise<void>;
  upload: (sceneId: string, file: File) => Promise<void>;
  generate: (sceneId?: string, replace?: boolean) => Promise<void>;
  narration: () => Promise<void>;
  render: () => Promise<void>;
  stopImages: () => void;
  stopping: boolean;
}
