const fs = require('node:fs');
const path = require('node:path');
const { localTool, studio } = require('./local-tools.cjs');

async function main() {
  let missing = false;
  function check(ok, label) {
    console.log(`${ok ? 'PASS' : 'MISSING'} ${label}`);
    if (!ok) missing = true;
  }
  for (const [name, prefix, endpoint, fallback] of [
    ['ComfyUI', 'COMFYUI', '/system_stats', 'http://127.0.0.1:8188'],
    ['VieNeu-TTS', 'VIENEU', '/health', 'http://127.0.0.1:8000']
  ]) {
    const tool = localTool(name, prefix);
    check(fs.existsSync(tool.repo), `${name} repo: ${tool.repo}`);
    check(fs.existsSync(tool.python), `${name} Python: ${tool.python}`);
    const url = `${(process.env[`${prefix}_BASE_URL`] || fallback).replace(/\/$/, '')}${endpoint}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000), headers: prefix === 'VIENEU' && process.env.VIENEU_API_KEY ? { Authorization: `Bearer ${process.env.VIENEU_API_KEY}` } : {} });
      check(response.ok, `${name} API: ${url} (HTTP ${response.status})`);
      await response.body?.cancel();
    } catch { check(false, `${name} API chưa chạy: ${url}`); }
  }
  check(process.env.ENABLE_COMFYUI === 'true', 'ENABLE_COMFYUI=true');
  const workflow = path.resolve(studio, process.env.COMFYUI_WORKFLOW || 'workflows/comfyui-text-to-image.json');
  check(fs.existsSync(workflow), 'ComfyUI workflow template');
  if (fs.existsSync(workflow) && fs.readFileSync(workflow, 'utf8').includes('"{{CHECKPOINT}}"')) {
    check(!!process.env.COMFYUI_CHECKPOINT, 'COMFYUI_CHECKPOINT đã chọn (không tự tải model)');
  }
  const ffmpeg = require('ffmpeg-static');
  check(fs.existsSync(process.env.FFMPEG_PATH && process.env.FFMPEG_PATH !== 'ffmpeg' ? process.env.FFMPEG_PATH : ffmpeg), 'FFmpeg executable');
  process.exitCode = missing ? 1 : 0;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
