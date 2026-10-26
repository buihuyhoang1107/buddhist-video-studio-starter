"use client";

import { useState } from "react";
import { Box, Button, Paper, Stack } from "@mui/material";
import { DialogElement, NoteComponent, StackRowWrap, STYLE, TypographyOneLine, numberUtil } from "sevago-library";
import type { StoryboardView } from "@/core/contracts/storyboard-view";
import type { StoryboardWorkspaceState } from "./studio.interface";

interface SceneImagesPartProps {
  board: StoryboardView;
  actions: StoryboardWorkspaceState;
  canGenerate: boolean;
}

export function SceneImagesPart({ board, actions, canGenerate }: SceneImagesPartProps) {
  const [replaceSceneId, setReplaceSceneId] = useState("");
  const locked = actions.busy || actions.rendering;
  const hasMissing = board.scenes.some(scene => !scene.imageUrl);
  return <Stack spacing={2}>
    <StackRowWrap gap={STYLE.PADDING_GAP_ITEM}>
      <Button variant="contained" disabled={locked || !canGenerate || !hasMissing} onClick={() => actions.generate()}>Tạo ảnh cho các đoạn còn thiếu</Button>
      {actions.busy && actions.action.startsWith("Đang tạo ảnh") && <Button disabled={actions.stopping} onClick={actions.stopImages}>{actions.stopping ? "Sẽ dừng sau ảnh hiện tại…" : "Dừng sau ảnh hiện tại"}</Button>}
    </StackRowWrap>
    {!canGenerate && <NoteComponent type="warning" content="Để tạo ảnh AI, kết nối ComfyUI, bật tạo ảnh và chọn checkpoint trong cấu hình phía trên. Bạn có thể upload ảnh ngay." />}
    {board.background && <NoteComponent type="warning" content="Video hiện dùng nền chung. Bỏ nền chung ở trên để sử dụng ảnh riêng của từng đoạn." />}
    {board.scenes.map((scene, index) => <Paper key={scene.id} variant="outlined" sx={{ padding: STYLE.PADDING_GAP_LAYOUT, borderRadius: STYLE.BORDER_RADIUS_ELEMENT }}>
      <Stack spacing={2}>
        <TypographyOneLine content={`Đoạn ${index + 1} · ${numberUtil.formatNumber(scene.duration)} giây${!board.audio ? " (ước tính)" : ""}`} sx={STYLE.TYPOGRAPHY.textSm.semiBold} />
        <TypographyOneLine content={scene.narration} sx={{ whiteSpace: "pre-wrap" }} />
        <TypographyOneLine content={`Phụ đề: ${scene.subtitle}`} sx={{ whiteSpace: "pre-wrap" }} />
        {scene.imageUrl && <Box component="img" src={scene.imageUrl} alt={`Ảnh đoạn ${index + 1}`} sx={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: STYLE.BORDER_RADIUS_ELEMENT }} />}
        <StackRowWrap gap={STYLE.PADDING_GAP_ITEM}>
          <Button variant="outlined" disabled={locked || !canGenerate} onClick={() => scene.imageUrl ? setReplaceSceneId(scene.id) : actions.generate(scene.id)}>{scene.imageUrl ? "Tạo lại ảnh đoạn này" : "Tạo ảnh đoạn này"}</Button>
          <Button component="label" variant="outlined" disabled={locked}>{scene.imageUrl ? "Thay bằng ảnh của tôi" : "Upload ảnh đoạn này"}
            <Box component="input" hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={locked} onChange={(event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) actions.upload(scene.id, file); }} />
          </Button>
        </StackRowWrap>
      </Stack>
    </Paper>)}
    <DialogElement open={!!replaceSceneId} onClose={() => setReplaceSceneId("")} label="Thay ảnh của đoạn này?" nodeContent={<NoteComponent type="warning" content="Ảnh hiện tại, kể cả ảnh bạn upload, chỉ được thay sau khi ComfyUI tạo ảnh mới thành công. Các đoạn khác được giữ nguyên." />} buttonLeft={{ content: "Giữ ảnh hiện tại", onClick: () => setReplaceSceneId("") }} buttonRight={{ content: "Tạo ảnh thay thế", onClick: () => { const id = replaceSceneId; setReplaceSceneId(""); actions.generate(id, true); } }} />
  </Stack>;
}
