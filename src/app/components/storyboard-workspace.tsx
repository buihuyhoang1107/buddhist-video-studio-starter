"use client";

import { useEffect, useState } from "react";
import { Accordion, AccordionSummary, AccordionDetails, Alert, Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Stack, Typography } from "@mui/material";
import type { GenerationJob } from "@/core/contracts/job";
import type { StoryboardView } from "@/core/contracts/storyboard-view";
import type { VoiceMode } from "@/core/contracts/project";

export function StoryboardWorkspace({ job, onJob }: { job: GenerationJob; onJob: (job: GenerationJob) => void }) {
  const [board, setBoard] = useState<StoryboardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>(job.config.voiceMode);
  const rendering = ["VOICE", "RENDERING", "QA"].includes(job.status);

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

  async function media(kind: "background" | "audio", file?: File) {
    setBusy(true);
    setError(null);
    try {
      let response: Response;
      if (file) {
        if (file.size > 100 * 1024 * 1024) throw new Error("File tối đa 100 MB; ảnh tối đa 10 MB.");
        const data = new FormData(); data.set("kind", kind); data.set("file", file);
        response = await fetch(`/api/jobs/${job.id}/media`, { method: "POST", body: data });
      } else response = await fetch(`/api/jobs/${job.id}/media?kind=${kind}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const latest = await fetch(`/api/jobs/${job.id}`);
      if (!latest.ok) throw new Error("Không cập nhật được job; hãy mở lại job.");
      onJob(await latest.json());
      setBoard(result);
      setApproved(false);
      if (kind === "audio" && file) setVoiceMode("USER_AUDIO");
    } catch (error) { setError(error instanceof Error ? error.message : "Không lưu được tài nguyên."); }
    finally { setBusy(false); }
  }

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
      const response = await fetch(`/api/jobs/${job.id}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved, voiceMode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onJob(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Không bắt đầu render được."); }
    finally { setBusy(false); }
  }

  if (!board) return error ? <Alert severity="error">{error}</Alert> : null;
  const ready = board.scenes.length > 0 && (!!board.background || board.scenes.every((scene) => scene.imageUrl));
  return <Paper sx={{ p: 3 }}>
    <Stack spacing={3}>
      <Typography variant="h5">Lời kể — {board.title}</Typography>
      <Alert severity="info">Cốt truyện quyết định thời lượng. Dùng một ảnh hoặc video nền lặp cho cả truyện; lời kể nối tiếp, không thêm khoảng chờ giữa các đoạn.</Alert>
      <Typography>{board.scenes.length} đoạn liên tục · {board.audio ? "Thời lượng audio thực tế" : "Thời lượng đọc ước tính"}: {(board.audio?.durationSeconds ?? board.scenes.reduce((sum, scene) => sum + scene.duration, 0)).toFixed(1)} giây</Typography>
      <Typography variant="h6">1. Nền chung cho toàn bộ truyện</Typography>
      <Button component="label" variant="outlined" disabled={busy || rendering}>
        {board.background ? "Thay ảnh / video nền" : "Chọn một ảnh hoặc video nền"}
        <input hidden type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" disabled={busy || rendering} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void media("background", file); }} />
      </Button>
      <Typography variant="body2" color="text.secondary">Ảnh PNG/JPEG/WebP tối đa 10 MB; video MP4/WebM tối đa 100 MB. Âm thanh của video nền được tắt.</Typography>
      {board.background && <>
        {board.background.kind === "VIDEO" ? <Box component="video" src={board.background.url} controls loop muted sx={{ width: "100%", maxHeight: 300, bgcolor: "black" }} /> : <Box component="img" src={board.background.url} alt="Nền chung" sx={{ width: "100%", maxHeight: 300, objectFit: "contain" }} />}
        <Button disabled={busy || rendering} onClick={() => media("background")}>Bỏ nền chung, dùng ảnh riêng từng đoạn</Button>
      </>}
      <Typography variant="h6">2. Giọng đọc</Typography>
      <FormControl fullWidth>
        <InputLabel>Nguồn giọng đọc</InputLabel>
        <Select label="Nguồn giọng đọc" value={voiceMode} disabled={busy || rendering} onChange={(event) => { setVoiceMode(event.target.value as VoiceMode); setApproved(false); }}>
          <MenuItem value="LOCAL_TTS">Tự đọc bằng VieNeu local</MenuItem>
          <MenuItem value="USER_AUDIO">Audio tôi upload</MenuItem>
          <MenuItem value="NONE">Xuất không giọng đọc</MenuItem>
        </Select>
      </FormControl>
      {voiceMode === "LOCAL_TTS" && <Alert severity="info">Cần chạy dịch vụ VieNeu local: sau khi cài đặt lần đầu, mở terminal riêng và chạy npm run tts. Audio từng đoạn được tái sử dụng khi đổi nền.</Alert>}
      <Button component="label" variant="outlined" disabled={busy || rendering}>Upload audio toàn bộ truyện
        <input hidden type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" disabled={busy || rendering} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void media("audio", file); }} />
      </Button>
      {board.audio && <>
        <Box component="audio" controls src={board.audio.url} sx={{ width: "100%" }} />
        <Typography variant="body2">{board.audio.provider === "USER_AUDIO" ? "Audio bạn upload được ưu tiên. Phụ đề được chia thời gian ước tính theo văn bản; chưa căn theo từng từ." : "Giọng TTS: thời gian từng đoạn lấy từ audio đã tạo."}</Typography>
        <Button disabled={busy || rendering} onClick={() => media("audio")}>Bỏ audio hiện tại</Button>
      </>}
      <Typography variant="h6">3. Duyệt toàn bộ lời kể</Typography>
      <Paper variant="outlined" sx={{ p: 2, maxHeight: 420, overflow: "auto" }}><Typography sx={{ whiteSpace: "pre-wrap" }}>{board.scenes.map(scene => scene.narration).join(" ")}</Typography></Paper>
      <Accordion defaultExpanded={job.config.backgroundMode === "PER_SCENE"}>
      <AccordionSummary>Chi tiết các đoạn và ảnh riêng (tùy chọn)</AccordionSummary>
      <AccordionDetails><Stack spacing={2}>
      {board.scenes.map((scene, index) => <Box key={scene.id} sx={{ border: "1px solid", borderColor: "divider", p: 2, borderRadius: 2 }}>
        <Stack spacing={1.5}>
          <Typography fontWeight={700}>Đoạn {index + 1} · {scene.duration.toFixed(1)} giây{!board.audio ? " (ước tính)" : ""}</Typography>
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
      </Stack></AccordionDetails></Accordion>
      {error && <Alert severity="error">{error}</Alert>}
      <FormControlLabel control={<Checkbox checked={approved} disabled={busy || rendering} onChange={(event) => setApproved(event.target.checked)} />} label="Tôi đã duyệt cốt truyện, phụ đề, nền minh họa và audio đã upload (nếu có) khớp lời kể; đồng ý tạo video." />
      <Button variant="contained" size="large" disabled={!ready || !approved || busy || rendering || (voiceMode === "USER_AUDIO" && board.audio?.provider !== "USER_AUDIO")} onClick={render}>
        {rendering ? "Đang dựng video…" : job.outputPath ? "Dựng lại video" : "Tạo video MP4"}
      </Button>
      {!ready && <Typography color="text.secondary">Chỉ cần chọn một ảnh/video nền chung; hoặc chọn đủ ảnh riêng cho từng đoạn.</Typography>}
      {job.status === "COMPLETED" && job.outputPath && <Stack spacing={2}>
        <Typography variant="h6">Xem trước</Typography>
        <Box component="video" controls preload="metadata" src={`/api/jobs/${job.id}/video?v=${encodeURIComponent(job.updatedAt)}`} sx={{ width: "100%", maxHeight: 650, bgcolor: "black", borderRadius: 2 }} />
        <Button component="a" href={`/api/jobs/${job.id}/video?download=1`} variant="contained">Tải MP4</Button>
      </Stack>}
    </Stack>
  </Paper>;
}
