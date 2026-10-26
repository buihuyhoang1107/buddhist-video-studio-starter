"use client";

import { useState } from "react";
import { useFormik } from "formik";
import { Accordion, AccordionDetails, AccordionSummary, Autocomplete, Button, Checkbox, FormControlLabel, LinearProgress, Paper, Stack, TextField } from "@mui/material";
import { NoteComponent, StackRowWrap, STYLE, TypographyOneLine, otherUtil } from "sevago-library";
import type { LocalServiceName, StudioStatus } from "@/core/contracts/studio-settings";
import { studioSettingsSchema } from "@/core/studio/studio.constant";
import { studioApi } from "@/apis";

interface ServiceSettingsPartProps {
  status: StudioStatus;
  refresh: () => Promise<unknown>;
  disabled: boolean;
}

export function ServiceSettingsPart({ status, refresh, disabled }: ServiceSettingsPartProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<LocalServiceName>();
  const form = useFormik({
    initialValues: status.settings, enableReinitialize: true, validationSchema: studioSettingsSchema,
    onSubmit: async values => {
      setError(""); setMessage("");
      try { await studioApi.saveSettings(values); await refresh(); setMessage("Đã lưu cấu hình và kiểm tra kết nối. Các lần tạo tiếp theo dùng cấu hình này."); }
      catch (error) { setError(otherUtil.getErrorMessage(error)); }
    }
  });
  const locked = disabled || form.isSubmitting || !!starting;

  async function start(name: LocalServiceName) {
    setStarting(name); setError(""); setMessage("");
    try {
      await studioApi.saveSettings(form.values);
      setMessage((await studioApi.startService(name)).message);
      await refresh();
    } catch (error) { setError(otherUtil.getErrorMessage(error)); }
    finally { setStarting(undefined); }
  }

  return <Paper sx={{ padding: STYLE.PADDING_GAP_TAB, borderRadius: STYLE.BORDER_RADIUS_ELEMENT_WRAPPER }}>
    <Stack spacing={2}>
      <TypographyOneLine content="Dịch vụ tạo ảnh và giọng đọc" sx={STYLE.TYPOGRAPHY.textLg.semiBold} />
      <NoteComponent type={status.comfyui.ready ? "recommend" : "warning"} content={status.comfyui.message} />
      <NoteComponent type={status.vieneu.ready ? "recommend" : "warning"} content={status.vieneu.message} />
      <NoteComponent type={status.ollama.ready ? "recommend" : "info"} content={status.ollama.message} />
      <StackRowWrap gap={STYLE.PADDING_GAP_ITEM}>
        <Button disabled={locked} onClick={() => refresh()}>Kiểm tra lại kết nối</Button>
        <Button disabled={locked || status.comfyui.ready} onClick={() => start("comfyui")}>{starting === "comfyui" ? "Đang khởi động…" : "Khởi động ComfyUI"}</Button>
        <Button disabled={locked || status.vieneu.ready} onClick={() => start("vieneu")}>{starting === "vieneu" ? "Đang khởi động…" : "Khởi động VieNeu"}</Button>
      </StackRowWrap>
      <Accordion defaultExpanded={!status.comfyui.ready || !status.vieneu.ready} disableGutters>
        <AccordionSummary>Cấu hình dịch vụ, checkpoint và giọng đọc</AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <FormControlLabel control={<Checkbox checked={form.values.comfyuiEnabled} name="comfyuiEnabled" onChange={form.handleChange} disabled={locked} />} label="Dùng ComfyUI để tạo ảnh" />
            <TextField label="Địa chỉ ComfyUI" name="comfyuiBaseUrl" value={form.values.comfyuiBaseUrl} onChange={form.handleChange} onBlur={form.handleBlur} disabled={locked} error={!!(form.touched.comfyuiBaseUrl && form.errors.comfyuiBaseUrl)} helperText={form.touched.comfyuiBaseUrl && form.errors.comfyuiBaseUrl} />
            <Autocomplete freeSolo options={status.checkpoints} value={form.values.comfyuiCheckpoint} onInputChange={(_event, value) => form.setFieldValue("comfyuiCheckpoint", value)} disabled={locked} renderInput={params => <TextField {...params} label="Checkpoint tạo ảnh" helperText={status.comfyui.ready && !status.checkpoints.length ? "ComfyUI chưa có checkpoint. Cài model tương thích trước khi tạo ảnh." : "Chọn model đã cài trên ComfyUI; ảnh upload vẫn dùng được."} />} />
            <TextField label="Địa chỉ VieNeu" name="vieneuBaseUrl" value={form.values.vieneuBaseUrl} onChange={form.handleChange} onBlur={form.handleBlur} disabled={locked} error={!!(form.touched.vieneuBaseUrl && form.errors.vieneuBaseUrl)} helperText={form.touched.vieneuBaseUrl && form.errors.vieneuBaseUrl} />
            <Autocomplete freeSolo options={status.voices} getOptionLabel={option => typeof option === "string" ? option : option.name} value={form.values.vieneuVoice} onInputChange={(_event, value) => form.setFieldValue("vieneuVoice", value)} disabled={locked} renderInput={params => <TextField {...params} label="Giọng đọc VieNeu" error={!!form.errors.vieneuVoice} helperText={form.errors.vieneuVoice} />} />
            <TextField label="Model giọng đọc" name="vieneuModel" value={form.values.vieneuModel} onChange={form.handleChange} disabled={locked} error={!!form.errors.vieneuModel} helperText={form.errors.vieneuModel} />
            <TextField label="Địa chỉ Ollama" name="ollamaBaseUrl" value={form.values.ollamaBaseUrl} onChange={form.handleChange} onBlur={form.handleBlur} disabled={locked} error={!!(form.touched.ollamaBaseUrl && form.errors.ollamaBaseUrl)} helperText={form.touched.ollamaBaseUrl && form.errors.ollamaBaseUrl} />
            <Autocomplete freeSolo options={status.ollamaModels} getOptionLabel={option => typeof option === "string" ? option : option.name} value={form.values.ollamaModel} onInputChange={(_event, value) => form.setFieldValue("ollamaModel", value)} disabled={locked} renderInput={params => <TextField {...params} label="Model viết truyện" error={!!form.errors.ollamaModel} helperText={form.errors.ollamaModel} />} />
            <Button variant="contained" disabled={locked} onClick={event => { event.preventDefault(); form.handleSubmit(); }}>Lưu và kiểm tra kết nối</Button>
            <NoteComponent content="Cấu hình được lưu trên máy và có hiệu lực ngay. Cài môi trường Python/model là bước chuẩn bị lần đầu; các thao tác tạo ảnh, nghe lời kể và xuất MP4 thực hiện bên dưới." />
          </Stack>
        </AccordionDetails>
      </Accordion>
      {(form.isSubmitting || starting) && <LinearProgress />}
      {message && <NoteComponent type="recommend" content={message} />}
      {error && <NoteComponent type="error" content={error} />}
    </Stack>
  </Paper>;
}
