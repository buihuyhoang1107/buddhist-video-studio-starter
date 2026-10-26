"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from "@mui/material";
import type { GenerationJob } from "@/core/contracts/job";
import type { StoryboardView } from "@/core/contracts/storyboard-view";

export function StoryboardWorkspace({ job, onJob }: { job: GenerationJob; onJob: (job: GenerationJob) => void }) {
  const [board, setBoard] = useState<StoryboardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [withoutVoice, setWithoutVoice] = useState(false);
  const rendering = ["RENDERING", "QA"].includes(job.status);

  useEffect(() => {
    let active = true;
    setApproved(false);
    setBoard(null);
    async function load() {
      try {
        const response = await fetch(`/api/jobs/${job.id}/storyboard`);
        if (response.ok && active) setBoard(await response.json());
      } catch { if (active) setError("Không tải được storyboard. Thử mở lại job."); }
    }
    void load();
    return () => { active = false; };
  }, [job.id, job.status]);

  async function upload(sceneId: string, file: File) {
    setError(null);
    setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh tối đa 10 MB.");
      const data = new FormData();
      data.set("image", file);
      const response = await fetch(`/api/jobs/${job.id}/scenes/${sceneId}/image`, { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const latest = await fetch(`/api/jobs/${job.id}`);
      if (!latest.ok) throw new Error("Ảnh đã lưu nhưng chưa cập nhật được job. Hãy mở lại job.");
      onJob(await latest.json());
      setBoard(result);
      setApproved(false);
    } catch (error) { setError(error instanceof Error ? error.message : "Upload thất bại."); }
    finally { setBusy(false); }
  }

  async function render() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${job.id}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved, withoutVoice }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onJob(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Không bắt đầu render được."); }
    finally { setBusy(false); }
  }

  if (!board) return error ? <Alert severity="error">{error}</Alert> : null;
  const ready = board.scenes.length > 0 && board.scenes.every((scene) => scene.imageUrl);
  return <Paper sx={{ p: 3 }}>
    <Stack spacing={3}>
      <Typography variant="h5">Storyboard — {board.title}</Typography>
      <Alert severity="info">Upload ảnh PNG, JPEG hoặc WebP, tối đa 10 MB mỗi cảnh. Video dọc 1080 × 1920 có phụ đề, chưa có giọng đọc. Khi thay ảnh, chỉ cảnh thay đổi được dựng lại.</Alert>
      <Typography>{board.scenes.filter((scene) => scene.imageUrl).length}/{board.scenes.length} cảnh có ảnh · Tổng thời lượng: {board.scenes.reduce((sum, scene) => sum + scene.duration, 0)} giây</Typography>
      {board.scenes.map((scene, index) => <Box key={scene.id} sx={{ border: "1px solid", borderColor: "divider", p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Typography fontWeight={700}>Cảnh {index + 1} · {scene.duration} giây</Typography>
          <Typography>{scene.narration}</Typography>
          <Typography variant="body2" color="text.secondary">Phụ đề: {scene.subtitle}</Typography>
          {scene.imageUrl && <Box component="img" src={scene.imageUrl} alt={`Ảnh cảnh ${index + 1}`} sx={{ width: "100%", maxHeight: 320, objectFit: "contain", bgcolor: "#171b18", borderRadius: 1 }} />}
          <Button component="label" variant="outlined" disabled={busy || rendering}>
            {scene.imageUrl ? "Thay ảnh cảnh này" : "Chọn ảnh cho cảnh này"}
            <input hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || rendering} onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(scene.id, file);
            }} />
          </Button>
        </Stack>
      </Box>)}
      {error && <Alert severity="error">{error}</Alert>}
      <FormControlLabel control={<Checkbox checked={approved} disabled={busy || rendering} onChange={(event) => setApproved(event.target.checked)} />} label="Tôi đã duyệt nội dung, phụ đề và hình ảnh; đồng ý tạo video." />
      {job.config.voiceMode !== "NONE" && <FormControlLabel control={<Checkbox checked={withoutVoice} disabled={busy || rendering} onChange={(event) => setWithoutVoice(event.target.checked)} />} label="Job cũ có chọn voice. Tôi đồng ý render không giọng đọc với storyboard này." />}
      <Button variant="contained" size="large" disabled={!ready || !approved || busy || rendering || (job.config.voiceMode !== "NONE" && !withoutVoice)} onClick={render}>
        {rendering ? "Đang dựng video…" : job.outputPath ? "Dựng lại video" : "Tạo video MP4"}
      </Button>
      {!ready && <Typography color="text.secondary">Chọn đủ ảnh cho các cảnh để tạo video.</Typography>}
      {job.status === "COMPLETED" && job.outputPath && <Stack spacing={2}>
        <Typography variant="h6">Xem trước</Typography>
        <Box component="video" controls preload="metadata" src={`/api/jobs/${job.id}/video?v=${encodeURIComponent(job.updatedAt)}`} sx={{ width: "100%", maxHeight: 650, bgcolor: "black", borderRadius: 2 }} />
        <Button component="a" href={`/api/jobs/${job.id}/video?download=1`} variant="contained">Tải MP4</Button>
      </Stack>}
    </Stack>
  </Paper>;
}
