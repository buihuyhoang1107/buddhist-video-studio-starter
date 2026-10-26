const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const studio = path.resolve(__dirname, '..');
const envFile = path.join(studio, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

function localTool(name, prefix) {
  const sibling = path.resolve(studio, '..', name);
  const legacy = path.join(process.platform === 'win32' ? path.parse(studio).root : os.homedir(), 'ai-tools', name);
  const repo = path.resolve(process.env[`${prefix}_REPO`] || (fs.existsSync(sibling) ? sibling : legacy));
  const python = process.env[`${prefix}_PYTHON`] || path.join(repo, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  return { repo, python };
}

function startTool(tool, args, env = {}) {
  if (!fs.existsSync(tool.python)) {
    console.error(`Chưa có Python environment tại ${tool.python}. Xem docs/LOCAL_AI_SETUP.md để cài dependency vào repo ${tool.repo}.`);
    process.exitCode = 1;
    return;
  }
  const child = spawn(tool.python, args, { cwd: tool.repo, stdio: 'inherit', windowsHide: true, env: { ...process.env, ...env } });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

module.exports = { studio, localTool, startTool };
