# Windows setup

## Node
Install Node.js 20 or newer.

## FFmpeg
`npm install` downloads the bundled FFmpeg executable. No PATH changes are needed for
the upload-to-MP4 flow. To inspect the bundled version:

```powershell
node -e "require('child_process').execFileSync(require('ffmpeg-static'), ['-version'], {stdio:'inherit'})"
```

To use your own FFmpeg build, set a full executable path in `.env.local`.
The renderer uses FFmpeg itself for decode QA; ffprobe is not required in this milestone.

Example:

```env
FFMPEG_PATH=C:\\tools\\ffmpeg\\bin\\ffmpeg.exe
FFPROBE_PATH=C:\\tools\\ffmpeg\\bin\\ffprobe.exe
```

## Ollama — optional
Install Ollama and pull a local model. Then check:

```powershell
ollama list
```

The starter default is `qwen2.5:7b`; change `OLLAMA_MODEL` if you use another model.

## ComfyUI — optional
Run ComfyUI locally, normally at `http://127.0.0.1:8188`.

Codex 02 should later bind `src/server/comfyui/client.ts` to a concrete workflow JSON.
