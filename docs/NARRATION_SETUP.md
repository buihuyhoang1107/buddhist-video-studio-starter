# Continuous narration, shared backgrounds, and audio-driven length

## Application flow

1. Enter your full story, or ask Ollama to generate a connected story (short/medium/long).
2. Create the storyboard. Review the full narration; it is never limited to ten sentences.
3. Upload one still image (PNG/JPEG/WebP, 10 MiB) or looping video (MP4/WebM, 100 MiB).
   The background's own audio is discarded. Separate scene images remain an optional mode.
4. Choose local TTS or upload a complete narration (100 MiB, maximum decoded duration 60 min).
5. Approve the story, background, and any uploaded audio; render and preview the MP4.

No target seconds are needed. Before audio exists, the UI estimates reading duration from
Vietnamese space-separated syllables and audience pacing. Once audio exists, its exact
sample count determines video duration. The visual repeats until narration ends.

Local TTS audio is cached per text segment and voice settings. Segment PCM is joined
without inserted silence or independently encoded AAC boundaries. Natural speech pauses
created by the voice model remain. Changing a background reuses narration.

Uploaded audio overrides TTS and is preserved until explicitly removed. Its total duration
is exact; subtitle segment timing is proportional to text length, not speech recognition
or word alignment. Listen to the preview to check that the recording matches the script.

## Free local VieNeu service

Official source and current setup: https://github.com/pnnbao97/VieNeu-TTS
Speech API implementation: https://github.com/pnnbao97/VieNeu-TTS/blob/main/apps/openai_speech.py

Install `uv` using its official instructions, then in a separate terminal:

```powershell
New-Item -ItemType Directory -Force D:\ai-tools
cd D:\ai-tools
git clone --depth 1 https://github.com/pnnbao97/VieNeu-TTS.git
cd VieNeu-TTS
uv sync
$env:HOST = '127.0.0.1'
$env:VIENEU_BACKEND = 'onnx'
uv run python -m apps.openai_speech
```

If already cloned, use the existing folder. The first run downloads the open-source model
and loads it; wait until the service reports ready. CPU execution needs no CUDA or paid API.
This integration uses the open-source v3 Turbo speech API, not the proprietary v4 service.
Code and downloaded model dependencies have their own license files.

Defaults in the studio are:

```env
VIENEU_BASE_URL=http://127.0.0.1:8000
VIENEU_MODEL=vieneu-v3-turbo
VIENEU_VOICE=Hải Đăng
```

If you change `.env.local`, restart `npm run dev`. No model is installed into the React
app. Keep both the studio and local speech service running during TTS generation.
Upload narration to use the video flow without installing a TTS model.

After initial `uv sync`, you can start the speech server directly from this project's
terminal with `npm run tts`. It first uses the sibling `../VieNeu-TTS/.venv`,
then the legacy `D:\ai-tools\VieNeu-TTS\.venv` location on Windows.
Set `VIENEU_REPO` or `VIENEU_PYTHON` in `.env.local` or the shell for another location.
See [workspace local AI setup](LOCAL_AI_SETUP.md) when both repos already exist beside the studio.

## Validation

`npm test` checks full-story preservation, estimates, segment fitting, subtitle boundaries,
and input guards. `npm run test:video` checks the existing image-per-scene workflow.
`npm run test:narration` starts an isolated production server from `.next-validation` and a
test speech endpoint returning synthetic tones. It checks real FFmpeg audio/video output,
duration, looping, upload overrides, and speech cache behavior; it does not validate the
quality of a real VieNeu model. Build `.next-validation` first (see README).
