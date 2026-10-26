import { axiosRequest } from "@/lib/api-client";
import type { LocalServiceName, StudioSettings, StudioStatus } from "@/core/contracts/studio-settings";
import type { VideoProjectConfig, VoiceMode } from "@/core/contracts/project";
import type { GenerationJob } from "@/core/contracts/job";
import type { StoryboardView } from "@/core/contracts/storyboard-view";

export const getStatus = async (): Promise<StudioStatus> => (await axiosRequest.get<StudioStatus>("/studio/settings")).data;
export const saveSettings = async (settings: StudioSettings): Promise<StudioSettings> => (await axiosRequest.put<StudioSettings>("/studio/settings", settings)).data;
export const startService = async (name: LocalServiceName): Promise<{ message: string }> => (await axiosRequest.post<{ message: string }>(`/studio/services/${name}/start`)).data;
export const getJob = async (id: string): Promise<GenerationJob> => (await axiosRequest.get<GenerationJob>(`/jobs/${encodeURIComponent(id)}`)).data;
export const startJob = async (config: VideoProjectConfig): Promise<GenerationJob> => (await axiosRequest.post<GenerationJob>("/jobs/start", config)).data;
export const getStoryboard = async (id: string): Promise<StoryboardView> => (await axiosRequest.get<StoryboardView>(`/jobs/${id}/storyboard`)).data;
export const generateImage = async (id: string, sceneId: string, replace: boolean): Promise<StoryboardView> => (await axiosRequest.post<StoryboardView>(`/jobs/${id}/scenes/${sceneId}/generate`, { replace })).data;
export const generateNarration = async (id: string): Promise<StoryboardView> => (await axiosRequest.post<StoryboardView>(`/jobs/${id}/narration`)).data;
export const uploadImage = async (id: string, sceneId: string, file: File): Promise<StoryboardView> => {
  const body = new FormData(); body.set("image", file);
  return (await axiosRequest.post<StoryboardView>(`/jobs/${id}/scenes/${sceneId}/image`, body)).data;
};
export const uploadMedia = async (id: string, kind: "background" | "audio", file: File): Promise<StoryboardView> => {
  const body = new FormData(); body.set("kind", kind); body.set("file", file);
  return (await axiosRequest.post<StoryboardView>(`/jobs/${id}/media`, body)).data;
};
export const removeMedia = async (id: string, kind: "background" | "audio"): Promise<StoryboardView> => (await axiosRequest.delete<StoryboardView>(`/jobs/${id}/media`, { params: { kind } })).data;
export const renderVideo = async (id: string, approved: boolean, voiceMode: VoiceMode): Promise<GenerationJob> => (await axiosRequest.post<GenerationJob>(`/jobs/${id}/render`, { approved, voiceMode })).data;
