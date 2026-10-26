"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import type { GenerationJob } from "@/core/contracts/job";
import type { Audience, ContentMode, ImageMode, VideoProjectConfig, VoiceMode } from "@/core/contracts/project";
import { StoryboardWorkspace } from "./components/storyboard-workspace";

const defaultConfig: VideoProjectConfig = {
  title: "Cốc nước cho bà",
  audience: "CHILD",
  contentMode: "USER_STORY",
  imageMode: "USER_UPLOAD",
  voiceMode: "NONE",
  mediaMode: "IMAGE_VIDEO",
  durationSeconds: 45,
  theme: "Lòng hiếu thảo",
  story: "Một buổi chiều, An thấy bà đang mệt. Em nhẹ nhàng rót cho bà một cốc nước và ngồi bên cạnh. Bà mỉm cười. An hiểu rằng yêu thương đôi khi bắt đầu từ một việc rất nhỏ."
};

export default function HomePage() {
  const [config, setConfig] = useState(defaultConfig);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState("");
  const [starting, setStarting] = useState(false);

  async function openJob(id: string) {
    setError(null);
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(id.trim())}`);
      if (!response.ok) throw new Error("Không tìm thấy job. Kiểm tra lại mã job.");
      const restored = await response.json();
      setJob(restored);
      setJobId(restored.id);
      localStorage.setItem("video-studio-job", restored.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Không mở được job."); }
  }

  useEffect(() => {
    const saved = localStorage.getItem("video-studio-job");
    if (saved) void openJob(saved);
  }, []);

  useEffect(() => {
    if (!job || ["COMPLETED", "FAILED", "IMAGES"].includes(job.status)) return;
    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${job.id}`);
        const updated = response.ok ? await response.json() : null;
        if (active && updated) setJob(updated);
      } catch { if (active) setError("Mất kết nối với ứng dụng. Đang thử cập nhật lại…"); }
    }, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [job]);

  async function start() {
    setError(null);
    setStarting(true);
    try {
      const response = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Không tạo được job.");
        return;
      }
      setJob(data);
      setJobId(data.id);
      localStorage.setItem("video-studio-job", data.id);
    } catch { setError("Không kết nối được ứng dụng. Kiểm tra server và thử lại."); }
    finally { setStarting(false); }
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" fontWeight={800}>Buddhist Video Studio</Typography>
          <Typography color="text.secondary">Local-first starter — không database, không API trả phí bắt buộc.</Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            <TextField label="Tiêu đề" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} />
            <TextField label="Chủ đề" value={config.theme ?? ""} onChange={(e) => setConfig({ ...config, theme: e.target.value })} />

            <FormControl fullWidth>
              <InputLabel>Đối tượng</InputLabel>
              <Select label="Đối tượng" value={config.audience} onChange={(e) => setConfig({ ...config, audience: e.target.value as Audience })}>
                <MenuItem value="CHILD">Trẻ em</MenuItem>
                <MenuItem value="SENIOR">Người lớn tuổi</MenuItem>
                <MenuItem value="GENERAL">Chung</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Nguồn nội dung</InputLabel>
              <Select label="Nguồn nội dung" value={config.contentMode} onChange={(e) => setConfig({ ...config, contentMode: e.target.value as ContentMode })}>
                <MenuItem value="USER_STORY">Tôi nhập truyện</MenuItem>
                <MenuItem value="AI_GENERATE">AI local tự viết</MenuItem>
                <MenuItem value="REFERENCE_LIBRARY" disabled>Bộ truyện tham khảo (sắp có)</MenuItem>
              </Select>
            </FormControl>

            {config.contentMode === "USER_STORY" && (
              <TextField
                label="Nội dung truyện"
                multiline
                minRows={6}
                value={config.story ?? ""}
                onChange={(e) => setConfig({ ...config, story: e.target.value })}
              />
            )}

            <FormControl fullWidth>
              <InputLabel>Hình ảnh</InputLabel>
              <Select label="Hình ảnh" value={config.imageMode} onChange={(e) => setConfig({ ...config, imageMode: e.target.value as ImageMode })}>
                <MenuItem value="AI_GENERATE" disabled>AI local tự tạo (sắp có)</MenuItem>
                <MenuItem value="USER_UPLOAD">Tôi upload</MenuItem>
                <MenuItem value="MIXED" disabled>Kết hợp (sắp có)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Voice</InputLabel>
              <Select label="Voice" value={config.voiceMode} onChange={(e) => setConfig({ ...config, voiceMode: e.target.value as VoiceMode })}>
                <MenuItem value="NONE">Chưa dùng voice</MenuItem>
                <MenuItem value="LOCAL_TTS" disabled>Local TTS (sắp có)</MenuItem>
                <MenuItem value="USER_AUDIO" disabled>Tôi upload audio (sắp có)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Thời lượng mục tiêu (giây)"
              type="number"
              value={config.durationSeconds}
              onChange={(e) => setConfig({ ...config, durationSeconds: Number(e.target.value) || 45 })}
            />

            <Button variant="contained" size="large" disabled={starting || (!!job && !["IMAGES", "COMPLETED", "FAILED"].includes(job.status))} onClick={start}>{starting ? "Đang tạo…" : "Tạo storyboard mới"}</Button>
          </Stack>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Typography fontWeight={700}>Tiếp tục job đã tạo</Typography>
            <TextField label="Mã job" value={jobId} onChange={(event) => setJobId(event.target.value)} />
            <Button disabled={!jobId.trim() || starting} onClick={() => openJob(jobId)}>Mở storyboard</Button>
          </Stack>
        </Paper>
        {job && (
          <Paper sx={{ p: 3 }}>
            <Typography fontWeight={700}>Job: {job.id}</Typography>
            <Typography>Status: {job.status}</Typography>
            <Typography>Progress: {job.progress}%</Typography>
            <LinearProgress variant="determinate" value={job.progress} sx={{ my: 1 }} />
            <Typography>Step: {job.currentStep ?? "-"}</Typography>
            {job.error && <Alert severity="error" sx={{ mt: 2 }}>{job.error}</Alert>}
            {["IMAGES", "COMPLETED"].includes(job.status) && !job.outputPath && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Storyboard đã sẵn sàng. Upload ảnh cho từng cảnh bên dưới, duyệt nội dung rồi tạo video MP4.
              </Alert>
            )}
          </Paper>
        )}
        {job && <StoryboardWorkspace key={job.id} job={job} onJob={setJob} />}
      </Stack>
    </Container>
  );
}
