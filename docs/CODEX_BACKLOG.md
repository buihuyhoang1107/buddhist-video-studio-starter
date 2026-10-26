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
- [x] Build job progress UI.
- [ ] Add story editing screen before storyboard.
- [x] Add per-scene image upload.
- [x] Implement FFmpeg image-to-video scene renderer.
- [x] Concatenate scenes.
- [x] Add ASS subtitles (SRT export pending).
- [x] Add optional voice track.
- [x] Add preview/export screen.
- [x] Add one shared still or looping video background.
- [x] Use full narration and measured audio duration; remove the ten-sentence cutoff.

## Sprint 1 — Image generation

- [x] Define ComfyUI workflow JSON template (configurable checkpoint/API template).
- [x] Submit prompt to local ComfyUI.
- [x] Poll image generation job.
- [x] Copy result into temp job folder (decode validation and explicit per-scene replacement).
- [x] Add retry/replacement UI (missing-image batch, stop after current image, per-scene confirmation).
- [ ] Add style reference image support.

## Sprint 2 — Character consistency

- [ ] Character profile contract.
- [ ] Reference image set.
- [ ] Stable style prompt.
- [ ] Scene consistency checks.

## Sprint 3 — Voice

- [x] Local TTS adapter (VieNeu local speech API).
- [ ] CHILD narrator preset.
- [ ] SENIOR narrator preset.
- [x] Audio format/sample-rate normalization (loudness normalization pending).
- [x] User-audio override.

## Sprint 4 — Quality

- [x] Video decode QA (expanded technical checks pending).
- [ ] Subtitle safe-area checks.
- [ ] Loudness checks.
- [x] Per-scene image replacement/render cache and per-segment voice cache.

## Future only

- [ ] Local generative video provider.
- [ ] YouTube/TikTok/Meta publisher adapters.
- [ ] Analytics.
- [ ] NestJS + DB only if persistence/multi-user/remote API becomes necessary.
