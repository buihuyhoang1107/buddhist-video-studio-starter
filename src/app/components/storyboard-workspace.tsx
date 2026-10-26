"use client";

import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack } from "@mui/material";
import { NoteComponent, StackRowWrap, STYLE, TypographyOneLine, numberUtil } from "sevago-library";
import type { StoryboardWorkspaceProps } from "./studio.interface";
import { useStoryboardWorkspace } from "./use-storyboard-workspace";
import { SceneImagesPart } from "./scene-images.part";

export function StoryboardWorkspace(props: StoryboardWorkspaceProps) {
  const actions = useStoryboardWorkspace(props);
  const { board, busy, rendering, voiceMode, approved } = actions;
  const { job, services } = props;
  if (!board) return actions.error ? <NoteComponent type="error" content={actions.error} /> : null;
  const locked = busy || rendering;
  const ready = board.scenes.length > 0 && (!!board.background || board.scenes.every(scene => scene.imageUrl));
  const canGenerate = !!(services?.comfyui.ready && services.settings.comfyuiEnabled && services.settings.comfyuiCheckpoint);
  const canSpeak = !!services?.vieneu.ready;
  const totalDuration = board.audio?.durationSeconds ?? board.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  return <Paper sx={{ padding: STYLE.PADDING_GAP_TAB, borderRadius: STYLE.BORDER_RADIUS_ELEMENT_WRAPPER }}>
    <Stack spacing={3}>
      <TypographyOneLine content={board.title} sx={STYLE.TYPOGRAPHY.textLg.semiBold} />
      <TypographyOneLine content={`${board.scenes.length} đoạn · ${board.audio ? "Thời lượng audio thực tế" : "Thời lượng đọc ước tính"}: ${numberUtil.formatNumber(totalDuration)} giây`} sx={{ whiteSpace: "normal" }} />
      {busy && <Stack spacing={1}><TypographyOneLine content={actions.action} sx={{ whiteSpace: "normal" }} /><LinearProgress /></Stack>}
      {actions.error && <NoteComponent type="error" content={actions.error} />}

      <TypographyOneLine content="2. Chuẩn bị ảnh minh họa" sx={STYLE.TYPOGRAPHY.textLg.semiBold} />
      <NoteComponent content="Chọn một ảnh/video nền cho toàn bộ truyện, hoặc tạo/upload ảnh riêng cho từng đoạn. Thời lượng video theo lời kể." />
      <Button component="label" variant="outlined" disabled={locked}>{board.background ? "Thay ảnh / video nền chung" : "Upload ảnh / video nền chung"}
        <Box component="input" hidden type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" disabled={locked} onChange={(event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) actions.media("background", file); }} />
      </Button>
      <TypographyOneLine content="Ảnh PNG/JPEG/WebP tối đa 10 MB; video MP4/WebM tối đa 100 MB. Âm thanh video nền được tắt." sx={{ whiteSpace: "normal" }} />
      {board.background && <>
        {board.background.kind === "VIDEO" ? <Box component="video" src={board.background.url} controls loop muted sx={{ width: "100%", maxHeight: 300 }} /> : <Box component="img" src={board.background.url} alt="Nền chung" sx={{ width: "100%", maxHeight: 300, objectFit: "contain" }} />}
        <Button disabled={locked} onClick={() => actions.media("background")}>Bỏ nền chung, dùng ảnh từng đoạn</Button>
      </>}
      <Accordion defaultExpanded={!board.background} disableGutters>
        <AccordionSummary>Ảnh riêng cho từng đoạn · tạo bằng ComfyUI hoặc upload</AccordionSummary>
        <AccordionDetails><SceneImagesPart board={board} actions={actions} canGenerate={canGenerate} /></AccordionDetails>
      </Accordion>

      <TypographyOneLine content="3. Chuẩn bị và nghe giọng đọc" sx={STYLE.TYPOGRAPHY.textLg.semiBold} />
      <FormControl fullWidth>
        <InputLabel>Nguồn giọng đọc</InputLabel>
        <Select label="Nguồn giọng đọc" value={voiceMode} disabled={locked} onChange={event => actions.setVoiceMode(event.target.value)}>
          <MenuItem value="LOCAL_TTS">Tự đọc bằng VieNeu local</MenuItem>
          <MenuItem value="USER_AUDIO">Audio tôi upload</MenuItem>
          <MenuItem value="NONE">Xuất không giọng đọc</MenuItem>
        </Select>
      </FormControl>
      {voiceMode === "LOCAL_TTS" && <Stack spacing={2}>
        <TypographyOneLine content={`Giọng đã lưu: ${services?.settings.vieneuVoice || "Đang tải cấu hình"}. Có thể đổi trong Cấu hình dịch vụ.`} sx={{ whiteSpace: "normal" }} />
        {!canSpeak && <NoteComponent type="warning" content="VieNeu chưa kết nối. Khởi động ở khu vực dịch vụ phía trên, hoặc upload audio để tiếp tục." />}
        <Button variant="outlined" disabled={locked || !canSpeak || board.audio?.provider === "USER_AUDIO"} onClick={actions.narration}>{board.audio?.provider === "LOCAL_TTS" ? "Cập nhật và nghe giọng đọc" : "Tạo và nghe giọng đọc"}</Button>
      </Stack>}
      <Button component="label" variant="outlined" disabled={locked}>Upload audio toàn bộ truyện
        <Box component="input" hidden type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" disabled={locked} onChange={(event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) actions.media("audio", file); }} />
      </Button>
      {board.audio && <Stack spacing={2}>
        <Box component="audio" controls src={board.audio.url} sx={{ width: "100%" }} />
        <NoteComponent content={board.audio.provider === "USER_AUDIO" ? "Audio bạn upload được ưu tiên. Phụ đề chia thời gian ước tính theo văn bản; nghe để kiểm tra khớp lời kể. Bỏ audio hiện tại nếu muốn chuyển sang VieNeu." : "Thời gian từng đoạn được lấy từ audio VieNeu. Lời kể đã tạo được tái sử dụng khi thay ảnh."} />
        <Button disabled={locked} onClick={() => actions.media("audio")}>Bỏ audio hiện tại</Button>
      </Stack>}

      <TypographyOneLine content="4. Duyệt nội dung và xuất video" sx={STYLE.TYPOGRAPHY.textLg.semiBold} />
      <Paper variant="outlined" sx={{ padding: STYLE.PADDING_GAP_LAYOUT, maxHeight: 420, overflow: "auto" }}><TypographyOneLine content={board.scenes.map(scene => scene.narration).join(" ")} sx={{ whiteSpace: "pre-wrap" }} /></Paper>
      {!ready && <NoteComponent type="warning" content="Còn thiếu hình ảnh. Upload một nền chung hoặc chuẩn bị đủ ảnh cho các đoạn trước khi xuất." />}
      <FormControlLabel control={<Checkbox checked={approved} disabled={locked} onChange={event => actions.setApproved(event.target.checked)} />} label="Tôi đã duyệt lời kể, phụ đề, hình ảnh và audio; đồng ý tạo video." />
      <Button variant="contained" size="large" disabled={!ready || !approved || locked || (voiceMode === "USER_AUDIO" && board.audio?.provider !== "USER_AUDIO") || (voiceMode === "LOCAL_TTS" && board.audio?.provider !== "USER_AUDIO" && !canSpeak)} onClick={actions.render}>
        {rendering ? "Đang dựng video…" : job.outputPath ? "Dựng lại video MP4" : "Tạo video MP4"}
      </Button>
      {job.status === "COMPLETED" && job.outputPath && <Stack spacing={2}>
        <TypographyOneLine content="Video hoàn tất — xem trước và tải xuống" sx={STYLE.TYPOGRAPHY.textLg.semiBold} />
        <Box component="video" controls preload="metadata" src={`/api/jobs/${job.id}/video?v=${encodeURIComponent(job.updatedAt)}`} sx={{ width: "100%", maxHeight: 650, borderRadius: STYLE.BORDER_RADIUS_ELEMENT }} />
        <StackRowWrap><Button component="a" href={`/api/jobs/${job.id}/video?download=1`} variant="contained">Tải MP4</Button></StackRowWrap>
      </Stack>}
    </Stack>
  </Paper>;
}
