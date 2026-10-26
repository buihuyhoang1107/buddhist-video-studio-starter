"use client";

import { useFormik } from "formik";
import { Button, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { NoteComponent } from "sevago-library";
import type { VideoProjectConfig } from "@/core/contracts/project";
import { projectConfigSchema } from "@/core/studio/studio.constant";
import { estimateDuration } from "@/core/narration/timing";

interface ProjectEditorPartProps {
  disabled: boolean;
  onStart: (config: VideoProjectConfig) => Promise<void>;
}

const defaultConfig: VideoProjectConfig = {
  title: "Cốc nước cho bà", audience: "CHILD", contentMode: "USER_STORY", imageMode: "MIXED",
  voiceMode: "LOCAL_TTS", mediaMode: "IMAGE_VIDEO", durationSeconds: 45, durationMode: "CONTENT",
  backgroundMode: "PER_SCENE", storyLength: "MEDIUM", theme: "Lòng hiếu thảo",
  story: "Một buổi chiều, An thấy bà đang mệt. Em nhẹ nhàng rót cho bà một cốc nước và ngồi bên cạnh. Bà mỉm cười. An hiểu rằng yêu thương đôi khi bắt đầu từ một việc rất nhỏ."
};

export function ProjectEditorPart({ disabled, onStart }: ProjectEditorPartProps) {
  const form = useFormik({ initialValues: defaultConfig, validationSchema: projectConfigSchema, onSubmit: onStart });
  const locked = disabled || form.isSubmitting;
  return <Stack spacing={2}>
    <TextField label="Tiêu đề video" name="title" value={form.values.title} onChange={form.handleChange} onBlur={form.handleBlur} error={!!(form.touched.title && form.errors.title)} helperText={form.touched.title && form.errors.title} disabled={locked} />
    <TextField label="Chủ đề" name="theme" value={form.values.theme} onChange={form.handleChange} onBlur={form.handleBlur} error={!!(form.touched.theme && form.errors.theme)} helperText={form.touched.theme && form.errors.theme} disabled={locked} />
    <FormControl fullWidth><InputLabel>Đối tượng</InputLabel><Select name="audience" label="Đối tượng" value={form.values.audience} onChange={form.handleChange} disabled={locked}>
      <MenuItem value="CHILD">Trẻ em</MenuItem><MenuItem value="SENIOR">Người lớn tuổi</MenuItem><MenuItem value="GENERAL">Chung</MenuItem>
    </Select></FormControl>
    <FormControl fullWidth><InputLabel>Nguồn nội dung</InputLabel><Select name="contentMode" label="Nguồn nội dung" value={form.values.contentMode} onChange={form.handleChange} disabled={locked}>
      <MenuItem value="USER_STORY">Tôi nhập truyện</MenuItem><MenuItem value="AI_GENERATE">AI local tự viết</MenuItem>
    </Select></FormControl>
    {form.values.contentMode === "USER_STORY" && <TextField label="Nội dung truyện" name="story" multiline minRows={6} value={form.values.story} onChange={form.handleChange} onBlur={form.handleBlur} error={!!(form.touched.story && form.errors.story)} helperText={form.touched.story && form.errors.story} disabled={locked} />}
    {form.values.contentMode === "AI_GENERATE" && <FormControl fullWidth><InputLabel>Độ dài truyện</InputLabel><Select name="storyLength" label="Độ dài truyện" value={form.values.storyLength} onChange={form.handleChange} disabled={locked}>
      <MenuItem value="SHORT">Ngắn</MenuItem><MenuItem value="MEDIUM">Vừa</MenuItem><MenuItem value="LONG">Dài</MenuItem>
    </Select></FormControl>}
    <NoteComponent content={form.values.contentMode === "USER_STORY" ? `Lời kể được giữ đầy đủ. Ước tính trước khi có audio: ${Math.ceil(estimateDuration(form.values.story || "", form.values.audience))} giây; video theo thời lượng audio thực tế.` : "AI viết truyện qua Ollama. Nội dung phải qua Dharma Review trước khi tạo ảnh và xuất video."} />
    <Button variant="contained" size="large" disabled={locked} onClick={event => { event.preventDefault(); form.handleSubmit(); }}>{form.isSubmitting ? "Đang tạo nội dung…" : "Tạo nội dung và chia đoạn"}</Button>
  </Stack>;
}
