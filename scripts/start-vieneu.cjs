const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const repo = process.env.VIENEU_REPO || (process.platform === 'win32'
  ? path.join(path.parse(process.cwd()).root, 'ai-tools', 'VieNeu-TTS')
  : path.join(os.homedir(), 'ai-tools', 'VieNeu-TTS'));
const python = path.join(repo, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!fs.existsSync(python)) {
  console.error(`Chưa có môi trường VieNeu tại ${repo}. Làm theo docs/NARRATION_SETUP.md để clone và chạy uv sync. Có thể đặt VIENEU_REPO nếu dùng thư mục khác.`);
  process.exitCode = 1;
} else {
  const child = spawn(python, ['-m', 'apps.openai_speech'], {
    cwd: repo, stdio: 'inherit', windowsHide: true,
    env: { ...process.env, HOST: process.env.HOST || '127.0.0.1', VIENEU_BACKEND: process.env.VIENEU_BACKEND || 'onnx' }
  });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}
