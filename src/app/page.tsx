"use client";

import { useCallback, useEffect, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Button, Container, LinearProgress, Paper, Stack, Step, StepLabel, Stepper, TextField } from "@mui/material";
import useSWR, { useSWRConfig } from "swr";
import { NoteComponent, StackRowWrap, STYLE, TypographyOneLine, otherUtil, stringUtil } from "sevago-library";
import { studioApi } from "@/apis";
import type { GenerationJob, JobStatus } from "@/core/contracts/job";
import type { VideoProjectConfig } from "@/core/contracts/project";
import { StoryboardWorkspace } from "./components/storyboard-workspace";
import { ServiceSettingsPart } from "./components/service-settings.part";
import { ProjectEditorPart } from "./components/project-editor.part";

const jobStatusTitles: Record<JobStatus, string> = {
  CREATED: "Đang chuẩn bị", CONTENT: "Đang chuẩn bị truyện", DHARMA_REVIEW: "Đang kiểm tra nội dung",
  STORYBOARD: "Đang chia đoạn", IMAGES: "Chuẩn bị hình ảnh và giọng đọc", VOICE: "Đang tạo giọng đọc",
  RENDERING: "Đang dựng video", QA: "Đang kiểm tra video", COMPLETED: "Video đã hoàn tất", FAILED: "Cần xử lý để tiếp tục"
};

export default function HomePage() {
  const [selectedId, setSelectedId] = useState("");
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const [editing, setEditing] = useState(true);
  const [assetBusy, setAssetBusy] = useState(false);
  const { mutate } = useSWRConfig();
  const { data: services, error: serviceError, mutate: refreshServices, isValidating: checkingServices } = useSWR("studio-services", studioApi.getStatus, { revalidateOnFocus: false, shouldRetryOnError: false });
  const { data: job, error: jobError } = useSWR(selectedId ? ["job", selectedId] : null, () => studioApi.getJob(selectedId), {
    revalidateOnFocus: false, shouldRetryOnError: false,
    refreshInterval: current => current && !["IMAGES", "COMPLETED", "FAILED"].includes(current.status) ? 1000 : 0
  });
  const processing = !!job && !["IMAGES", "COMPLETED", "FAILED"].includes(job.status);
  const locked = assetBusy || processing || opening;

  const acceptJob = useCallback((updated: GenerationJob) => {
    mutate(["job", updated.id], updated, { revalidate: false });
    setSelectedId(updated.id);
    setJobId(updated.id);
    localStorage.setItem("video-studio-job", updated.id);
  }, [mutate]);

  const openJob = useCallback(async (id: string) => {
    if (stringUtil.isEmpty(id)) return;
    setOpening(true); setError("");
    try { acceptJob(await studioApi.getJob(id)); setEditing(false); }
    catch (error) { setError(otherUtil.getErrorMessage(error)); }
    finally { setOpening(false); }
  }, [acceptJob]);

  useEffect(() => {
    const saved = localStorage.getItem("video-studio-job");
    if (saved) openJob(saved);
  }, [openJob]);

  async function start(config: VideoProjectConfig) {
    setError("");
    try { acceptJob(await studioApi.startJob(config)); setEditing(false); }
    catch (error) { setError(otherUtil.getErrorMessage(error)); }
  }

  const activeStep = !job ? 0 : job.status === "COMPLETED" && job.outputPath ? 4 : ["RENDERING", "QA"].includes(job.status) ? 3 : job.status === "VOICE" ? 2 : ["IMAGES", "FAILED"].includes(job.status) ? 1 : 0;
  return <Container maxWidth="md" sx={{ padding: STYLE.PADDING_GAP_TAB }}>
    <Stack spacing={3}>
      <TypographyOneLine content="Buddhist Video Studio" sx={STYLE.TYPOGRAPHY.textLg.bold} />
      <TypographyOneLine content="Từ lời kể đến video — chuẩn bị hình ảnh, nghe giọng đọc, duyệt và tải MP4 tại đây." sx={{ whiteSpace: "normal" }} />
      <Stepper activeStep={activeStep} alternativeLabel>
        {["Nội dung", "Hình ảnh", "Giọng đọc", "Duyệt và xuất"].map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      {checkingServices && <LinearProgress />}
      {services && <ServiceSettingsPart status={services} refresh={refreshServices} disabled={locked} />}
      {serviceError && <Stack spacing={1}><NoteComponent type="error" content="Không tải được cấu hình dịch vụ." /><Button onClick={() => refreshServices()}>Tải lại cấu hình</Button></Stack>}
      <Accordion expanded={editing} onChange={(_event, expanded) => setEditing(expanded)} disableGutters>
        <AccordionSummary>1. Nhập truyện hoặc để AI viết nội dung mới</AccordionSummary>
        <AccordionDetails><ProjectEditorPart disabled={locked} onStart={start} /></AccordionDetails>
      </Accordion>
      {(error || jobError) && <NoteComponent type="error" content={error || otherUtil.getErrorMessage(jobError)} />}
      <Accordion disableGutters>
        <AccordionSummary>Tiếp tục video đã tạo</AccordionSummary>
        <AccordionDetails><Stack spacing={2}>
          <TextField label="Mã video đã lưu" value={jobId} onChange={event => setJobId(event.target.value)} disabled={locked} />
          <StackRowWrap><Button disabled={locked || stringUtil.isEmpty(jobId)} onClick={() => openJob(jobId)}>Mở video đã lưu</Button></StackRowWrap>
        </Stack></AccordionDetails>
      </Accordion>
      {job && <Paper sx={{ padding: STYLE.PADDING_GAP_TAB, borderRadius: STYLE.BORDER_RADIUS_ELEMENT_WRAPPER }}>
        <Stack spacing={2}>
          <TypographyOneLine content={jobStatusTitles[job.status]} sx={STYLE.TYPOGRAPHY.textLg.semiBold} />
          <TypographyOneLine content={`Mã video: ${job.id}`} sx={{ whiteSpace: "normal", overflowWrap: "anywhere" }} />
          <LinearProgress variant="determinate" value={job.progress} />
          <TypographyOneLine content={`${job.progress}% · ${stringUtil.checkEmptyText(job.currentStep)}`} sx={{ whiteSpace: "normal" }} />
          {job.error && <NoteComponent type="error" content={job.error} />}
        </Stack>
      </Paper>}
      {job && <StoryboardWorkspace key={job.id} job={job} services={services} onJob={acceptJob} onBusyChange={setAssetBusy} />}
    </Stack>
  </Container>;
}
