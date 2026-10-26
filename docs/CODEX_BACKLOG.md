# CODEX BACKLOG

## Sprint 0 — Foundation

### Lead/Core
- [ ] Validate contracts in `src/core/contracts`.
- [ ] Finish file-based job repository.
- [ ] Add structured error types.
- [ ] Add progress events or polling contract.

### Content/AI
- [ ] Complete Ollama structured JSON generation.
- [ ] Implement ContentPlannerAgent.
- [ ] Implement ScriptWriterAgent.
- [ ] Strengthen DharmaReviewAgent with deterministic checks + optional local LLM review.
- [ ] Implement StoryboardAgent.
- [ ] Add reference library loader.

### Video/UX
- [ ] Build job progress UI.
- [ ] Add story editing screen before storyboard.
- [ ] Add per-scene image upload.
- [ ] Implement FFmpeg image-to-video scene renderer.
- [ ] Concatenate scenes.
- [ ] Add ASS/SRT subtitles.
- [ ] Add optional voice track.
- [ ] Add preview/export screen.

## Sprint 1 — Image generation

- [ ] Define ComfyUI workflow JSON template.
- [ ] Submit prompt to local ComfyUI.
- [ ] Poll image generation job.
- [ ] Copy result into temp job folder.
- [ ] Add retry/replacement UI.
- [ ] Add style reference image support.

## Sprint 2 — Character consistency

- [ ] Character profile contract.
- [ ] Reference image set.
- [ ] Stable style prompt.
- [ ] Scene consistency checks.

## Sprint 3 — Voice

- [ ] Local TTS adapter.
- [ ] CHILD narrator preset.
- [ ] SENIOR narrator preset.
- [ ] Audio normalization.
- [ ] User-audio override.

## Sprint 4 — Quality

- [ ] Video technical QA.
- [ ] Subtitle safe-area checks.
- [ ] Loudness checks.
- [ ] Per-scene regeneration.

## Future only

- [ ] Local generative video provider.
- [ ] YouTube/TikTok/Meta publisher adapters.
- [ ] Analytics.
- [ ] NestJS + DB only if persistence/multi-user/remote API becomes necessary.
