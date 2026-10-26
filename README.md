# Buddhist Video Studio — Local Starter

Local-first starter for creating Buddhist educational videos for children, seniors and general audiences.

## V1 goal

Topic / story → Dharma review → storyboard → images → voice → FFmpeg → preview/export MP4.

No database, no paid API and no cloud service are required by the architecture.

## Quick start

1. Install Node.js 20+.
2. FFmpeg is installed automatically by `npm install` through `ffmpeg-static`. A custom executable can be set with `FFMPEG_PATH` in `.env.local`.
3. Copy `.env.example` to `.env.local`.
4. Run:

```bash
npm install
npm run dev
```

5. Open `http://localhost:3000`.

Optional local AI:
- Ollama for story/script generation.
- ComfyUI image generation and local TTS are planned; the current renderer uses uploaded images with no voice.

## Create an MP4

1. Choose your story (or Ollama), uploaded images, and no voice; create the storyboard.
2. Read every scene and upload a PNG, JPEG, or WebP image (maximum 10 MB) for each.
3. Confirm you have reviewed the script, subtitles, and visuals, then click **Tạo video MP4**.
4. Keep the Next.js process running. When rendering completes, preview and download the MP4.
5. To replace one visual, upload a new image for that scene and render again. Unchanged
   scene clips are reused; the script and other scenes are preserved.

The last opened job is restored after refresh. To resume an older job, paste its ID into
**Tiếp tục job đã tạo**. Old jobs with voice selected can explicitly consent to render
without voice without creating a new storyboard. Output is 1080×1920, H.264, 25 fps,
with Vietnamese subtitles and letterboxing to preserve uploaded image proportions.
Scene transitions are direct cuts in this milestone; audio, pan/zoom, and crossfade are pending.

## Validation

```powershell
npm run typecheck
npm test
# With npm run dev running in another terminal:
npm run test:video
```

The API integration test creates its own disposable job and verifies review gates,
upload validation, corrupted-image retry, real FFmpeg rendering, streaming, downloads,
and cache reuse after replacing one scene. It does not alter existing jobs.
Set `STUDIO_BUILD_DIR=.next-validation` when building alongside a running development
server to avoid sharing its `.next` files.

## Important

This starter intentionally does not include a database or a separate NestJS backend. Temporary job metadata is written under `temp/<jobId>/` and final files go to `output/`.

Read `GEN.md`, `AGENTS.md`, `WORKFLOW.md`, and `docs/CODEX_BACKLOG.md` before asking Codex to implement new features.
