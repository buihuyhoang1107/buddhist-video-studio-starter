const { localTool, startTool } = require('./local-tools.cjs');

const url = new URL(process.env.VIENEU_BASE_URL || 'http://127.0.0.1:8000');
startTool(localTool('VieNeu-TTS', 'VIENEU'), ['-m', 'apps.openai_speech'], {
  HOST: '127.0.0.1', PORT: url.port || (url.protocol === 'https:' ? '443' : '80'),
  VIENEU_BACKEND: process.env.VIENEU_BACKEND || 'onnx'
});
