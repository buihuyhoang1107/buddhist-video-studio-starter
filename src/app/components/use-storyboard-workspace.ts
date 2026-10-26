"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { otherUtil } from "sevago-library";
import { studioApi } from "@/apis";
import type { VoiceMode } from "@/core/contracts/project";
import type { StoryboardView } from "@/core/contracts/storyboard-view";
import type { StoryboardWorkspaceProps, StoryboardWorkspaceState } from "./studio.interface";

export function useStoryboardWorkspace({ job, onJob, onBusyChange, services }: StoryboardWorkspaceProps): StoryboardWorkspaceState {
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [approved, setApproved] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(job.config.voiceMode);
  const [stopping, setStopping] = useState(false);
  const cancelImages = useRef(false);
  const rendering = ["VOICE", "RENDERING", "QA"].includes(job.status);
  const canLoad = ["IMAGES", "VOICE", "RENDERING", "QA", "COMPLETED", "FAILED"].includes(job.status);
  const { data: board, error: loadError, mutate } = useSWR(canLoad ? ["storyboard", job.id, job.status] : null, () => studioApi.getStoryboard(job.id), { revalidateOnFocus: false, shouldRetryOnError: false });

  useEffect(() => { setApproved(false); }, [services?.settings]);

  async function run(label: string, operation: () => Promise<void>) {
    if (action || rendering) return;
    setAction(label);
    setError("");
    setApproved(false);
    onBusyChange(true);
    try { await operation(); }
    catch (error) { setError(otherUtil.getErrorMessage(error)); }
    finally { setAction(""); onBusyChange(false); }
  }

  async function accept(result: StoryboardView) {
    await mutate(result, { revalidate: false });
    onJob(await studioApi.getJob(job.id));
  }

  async function media(kind: "background" | "audio", file?: File) {
    await run("Đang lưu tài nguyên…", async () => {
      await accept(file ? await studioApi.uploadMedia(job.id, kind, file) : await studioApi.removeMedia(job.id, kind));
      if (kind === "audio" && file) setVoiceMode("USER_AUDIO");
    });
  }

  async function generate(sceneId?: string, replace = false) {
    if (!board) return;
    cancelImages.current = false;
    setStopping(false);
    await run("Đang tạo ảnh…", async () => {
      if (sceneId) { await accept(await studioApi.generateImage(job.id, sceneId, replace)); return; }
      for (const [index, scene] of board.scenes.entries()) {
        if (cancelImages.current) break;
        if (scene.imageUrl) continue;
        setAction(`Đang tạo ảnh đoạn ${index + 1}/${board.scenes.length}…`);
        await accept(await studioApi.generateImage(job.id, scene.id, false));
      }
    });
  }

  async function render() {
    // Approval must be captured before run() resets it for the next revision.
    const reviewed = approved;
    await run("Đang bắt đầu dựng video…", async () => onJob(await studioApi.renderVideo(job.id, reviewed, voiceMode)));
  }

  return {
    board, error: error || (loadError && job.status !== "FAILED" ? otherUtil.getErrorMessage(loadError) : ""),
    action, busy: !!action, rendering, approved, setApproved, voiceMode,
    setVoiceMode: mode => { setVoiceMode(mode); setApproved(false); }, media, generate, render,
    upload: (sceneId, file) => run("Đang lưu ảnh…", async () => accept(await studioApi.uploadImage(job.id, sceneId, file))),
    narration: () => run("Đang tạo giọng đọc. Bạn có thể nghe trước khi xuất video…", async () => accept(await studioApi.generateNarration(job.id))),
    stopImages: () => { cancelImages.current = true; setStopping(true); }, stopping
  };
}
