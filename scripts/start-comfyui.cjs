const { localTool, startTool } = require('./local-tools.cjs');

const url = new URL(process.env.COMFYUI_BASE_URL || 'http://127.0.0.1:8188');
startTool(localTool('ComfyUI', 'COMFYUI'), [
  'main.py', '--listen', '127.0.0.1', '--port', url.port || (url.protocol === 'https:' ? '443' : '80'),
  ...(process.env.COMFYUI_CPU === 'true' ? ['--cpu'] : [])
]);
