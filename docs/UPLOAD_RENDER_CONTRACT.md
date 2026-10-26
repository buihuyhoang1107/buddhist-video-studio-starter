# Upload and render contract

The narration-first extension in `NARRATION_CONTRACT.md` supersedes the silent-only,
ten-scene, and voice limitations below. This document records the original milestone.

This change defines the shared Lead/Core contract before implementing Video/UX.
Content/AI interfaces remain unchanged. Implementation is sequential in this workstream.

Approaches considered: browser rendering (large browser memory use), a separate render
service (extra process and deployment), and FFmpeg in the existing local Next.js runtime.
Choose the third approach; use ffmpeg-static by default and respect a custom FFMPEG_PATH.

- New storyboards stop at IMAGES, progress 60, awaiting manual image uploads. COMPLETED
  means an MP4 exists for new jobs. Old COMPLETED storyboard-only jobs remain resumable.
- GET /api/jobs/:id/storyboard returns the storyboard with imageUrl fields, never disk paths.
- POST /api/jobs/:id/scenes/:sceneId/image accepts multipart field `image` (PNG/JPEG/WebP,
  maximum 10 MiB). The server detects file signatures and creates filenames itself.
- GET on the same image endpoint serves the uploaded image.
- POST /api/jobs/:id/render accepts `{ approved: true }`. Every scene needs an image,
  the saved Dharma review must pass. Voice is not supported in this milestone; old jobs
  can opt into silent rendering explicitly with `withoutVoice: true`, preserving their storyboard.
  The action confirms human review of the script, subtitles, and uploaded visuals.
- A filesystem lock serializes uploads and renders for one job. Conflicts return 409.
- Render errors preserve storyboard and assets for retry. Scene cache keys include image
  bytes, subtitle, duration, audience, and renderer version. Only changed scenes re-render.
- GET /api/jobs/:id/video streams MP4 with byte ranges. `?download=1` adds attachment headers.
- Final files are output/:jobId.mp4. Temporary scene clips and subtitles stay under the job.
- The UI offers upload mode and no voice. ComfyUI, TTS, and audio upload are outside this
  milestone. Existing jobs requesting voice require explicit silent-render consent.
- No database, paid API, network rendering service, or automatic publishing is added.

Validation: typecheck, production build, unit checks for subtitles/format validation, and
API integration through upload, mandatory review, render, preview, range/download, retry,
and scene-cache reuse. Human visual review occurs through the preview before download.
