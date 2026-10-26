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
- VieNeu open-source local TTS for Vietnamese narration; uploaded narration is also supported.
- ComfyUI image generation is planned. Upload one image, a looping background video, or individual scene images.

## Create an MP4

1. Enter the complete story (or ask Ollama to write a short/medium/long connected story).
2. Choose a shared still image or looping MP4/WebM background; individual scene images remain optional.
3. Upload the complete narration, or choose local VieNeu TTS. Video length follows actual audio;
   before speech exists, the UI labels text-based timing as an estimate. No target duration is required.
4. Confirm you have reviewed the script, subtitles, visuals, and uploaded audio, then click **Tạo video MP4**.
5. Keep the Next.js process running. When rendering completes, preview and download the MP4.
6. To replace one visual, upload a new background or scene image and render again. Unchanged
   scene clips are reused; the script and other scenes are preserved.

The last opened job is restored after refresh. To resume an older job, paste its ID into
**Tiếp tục job đã tạo**. Old jobs can choose a voice source at render time without
creating a new storyboard. Output is 1080×1920, H.264, 25 fps,
with Vietnamese subtitles and letterboxing to preserve uploaded image proportions.
Scene transitions are direct cuts; pan/zoom and crossfade are pending. Local TTS segment PCM
is joined without inserted gaps and encoded as one continuous AAC track. Uploaded audio takes
priority over TTS. Its total duration is exact; subtitle timings are estimated proportionally.
See [narration setup](docs/NARRATION_SETUP.md) to run the free local VieNeu speech service.

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

To verify the narration flow with an isolated speech test service (synthetic tones, not real
voice quality), run:

```powershell
$env:STUDIO_BUILD_DIR = '.next-validation'
npm run build
npm run test:narration
```

## Important

This starter intentionally does not include a database or a separate NestJS backend. Temporary job metadata is written under `temp/<jobId>/` and final files go to `output/`.

Read `GEN.md`, `AGENTS.md`, `WORKFLOW.md`, and `docs/CODEX_BACKLOG.md` before asking Codex to implement new features.
