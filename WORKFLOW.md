# WORKFLOW.md

## V1 state flow

```text
CREATED
→ CONTENT
→ DHARMA_REVIEW
→ STORYBOARD
→ IMAGES
→ VOICE
→ RENDERING
→ QA
→ COMPLETED
```

Failure state: `FAILED`.

## Upload-to-MP4 milestone

`IMAGES` pauses for manual per-scene uploads and human review. Rendering resumes through
`POST /api/jobs/:id/render` only after the saved Dharma review passes and the user confirms
approval. This milestone exports a silent MP4 with burned-in subtitles; AI image generation
and voice remain pending. Legacy storyboard-only COMPLETED jobs can resume by ID.
New COMPLETED jobs have an outputPath. Failed renders retain inputs for retry, and unchanged
scene clips are reused when one image changes. See `docs/UPLOAD_RENDER_CONTRACT.md`.

## Important behavior

- `USER_STORY`: preserve the original message; only adapt length/language/scene structure unless the user asks for a rewrite.
- `REFERENCE_LIBRARY`: use files under `references/stories/` as inspiration/source context.
- `AI_GENERATE`: use local LLM provider when enabled.
- `USER_UPLOAD`: user assets take priority over generated assets.
- `MIXED`: each scene can choose its own source.
- Image generation failure must allow retry/upload/skip instead of killing the whole project.
- Final export should be vertical 1080x1920 MP4 by default.

## V1 acceptance flow

```text
Topic or story
→ produce a content draft
→ Dharma review passes
→ storyboard generated
→ scene image source resolved
→ optional local voice generated
→ subtitles prepared
→ FFmpeg produces MP4
→ user can preview/export
```
