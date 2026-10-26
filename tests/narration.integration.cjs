// The speech endpoint below returns test tones, not a real model's voice.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFileSync, spawnSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const tone = (duration, frequency = 880) => execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=${frequency}:sample_rate=24000:duration=${duration}`, '-ac', '1', '-c:a', 'pcm_s16le', '-f', 'wav', '-'], { windowsHide: true });

async function availablePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('audio-driven narration, repeating image/video backgrounds, manual audio priority, and TTS reuse', { timeout: 180000 }, async () => {
  let child, id;
  let logs = '';
  const requests = [];
  const wav = tone(0.72);
  const speech = http.createServer(async (request, response) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    try {
      assert.equal(request.url, '/v1/audio/speech');
      const body = JSON.parse(raw);
      assert.equal(body.response_format, 'wav');
      requests.push(body.input);
      response.writeHead(200, { 'Content-Type': 'audio/wav', Connection: 'close' });
      response.end(wav);
    } catch (error) { response.writeHead(400); response.end(String(error)); }
  });
  await new Promise(resolve => speech.listen(0, '127.0.0.1', resolve));
  const port = await availablePort();
  const base = `http://127.0.0.1:${port}`;
  const post = (url, data) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  async function waitFor(states) {
    for (let i = 0; i < 200; i++) {
      const response = await fetch(`${base}/api/jobs/${id}`);
      const job = await response.json();
      if (states.includes(job.status)) return job;
      await delay(250);
    }
    throw new Error('Job timeout: ' + logs.slice(-2000));
  }
  async function media(kind, bytes, name) {
    const data = new FormData(); data.set('kind', kind); data.set('file', new Blob([bytes]), name);
    const response = await fetch(`${base}/api/jobs/${id}/media`, { method: 'POST', body: data });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result;
  }
  async function render(voiceMode) {
    const response = await post(`/api/jobs/${id}/render`, { approved: true, voiceMode });
    assert.equal(response.status, 202, await response.text());
    const result = await waitFor(['COMPLETED', 'FAILED']);
    assert.equal(result.status, 'COMPLETED', result.error);
    return result;
  }
  async function inspect() {
    const file = path.join(root, 'output', `${id}.mp4`);
    const result = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Audio: aac/);
    assert.match(result.stderr, /1080x1920/);
    const match = /Duration: (\d+):(\d+):([\d.]+)/.exec(result.stderr);
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
  try {
    await fs.access(path.join(root, '.next-validation', 'BUILD_ID'));
    child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(port)], {
      cwd: root, env: { ...process.env, STUDIO_BUILD_DIR: '.next-validation', STUDIO_SETTINGS_PATH: path.join(root, 'temp', `narration-test-${port}.json`), VIENEU_BASE_URL: `http://127.0.0.1:${speech.address().port}`, VIENEU_API_KEY: '', VIENEU_VOICE: 'Test voice' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-10000); });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {}
      await delay(200);
    }
    assert.ok(ready, logs);
    const story = 'An rót nước cho bà. Bà mỉm cười cảm ơn. An thấy lòng nhẹ nhàng.';
    const start = await post('/api/jobs/start', { title: 'Lời kể liên tục', audience: 'CHILD', contentMode: 'USER_STORY', imageMode: 'USER_UPLOAD', voiceMode: 'LOCAL_TTS', mediaMode: 'IMAGE_VIDEO', durationMode: 'CONTENT', durationSeconds: 300, story });
    assert.equal(start.status, 202);
    id = (await start.json()).id;
    assert.equal((await waitFor(['IMAGES', 'FAILED'])).status, 'IMAGES');
    const image = execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=green:s=160x240', '-frames:v', '1', '-c:v', 'png', '-f', 'image2pipe', '-'], { windowsHide: true });
    await media('background', image, 'background.png');
    assert.equal((await post(`/api/jobs/${id}/render`, { approved: false, voiceMode: 'LOCAL_TTS' })).status, 400);
    await render('LOCAL_TTS');
    assert.equal(requests.join(' '), story);
    const board = await (await fetch(`${base}/api/jobs/${id}/storyboard`)).json();
    assert.ok(Math.abs(board.audio.durationSeconds - 2.16) < 0.001);
    assert.ok(Math.abs(await inspect() - 2.16) < 0.08, 'MP4 must follow narration, not the 300-second config');
    assert.equal(board.audio.timing, 'MEASURED_SEGMENTS');
    assert.equal(board.scenes.reduce((sum, scene) => sum + scene.duration, 0), board.audio.durationSeconds);
    const sample = await fetch(base + board.audio.url, { headers: { Range: 'bytes=0-99' } });
    assert.equal(sample.status, 206);
    assert.equal((await sample.arrayBuffer()).byteLength, 100);
    const requestCount = requests.length;
    await render('LOCAL_TTS');
    assert.equal(requests.length, requestCount, 'Re-render must reuse speech');
    // A 0.4-second background clip must loop for the complete uploaded narration.
    const clipFile = path.join(root, 'temp', id, 'test-background.mp4');
    execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=160x240:r=25:d=0.4', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=0.4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', clipFile], { windowsHide: true });
    await media('background', await fs.readFile(clipFile), 'background.mp4');
    const uploaded = await media('audio', tone(3.12), 'narration.wav');
    assert.ok(Math.abs(uploaded.audio.durationSeconds - 3.12) < 0.001);
    assert.equal(uploaded.audio.timing, 'ESTIMATED_SEGMENTS');
    // Uploaded narration takes priority even if local TTS is selected on the render request.
    await render('LOCAL_TTS');
    assert.equal(requests.length, requestCount);
    assert.ok(Math.abs(await inspect() - 3.12) < 0.08);
    const raw = execFileSync(ffmpeg, ['-v', 'error', '-i', path.join(root, 'output', `${id}.mp4`), '-t', '0.25', '-map', '0:a:0', '-ar', '24000', '-ac', '1', '-f', 's16le', '-'], { windowsHide: true });
    function amplitude(frequency) {
      let real = 0, imaginary = 0;
      for (let i = 0; i < raw.length / 2; i++) { const value = raw.readInt16LE(i * 2); const angle = 2 * Math.PI * frequency * i / 24000; real += value * Math.cos(angle); imaginary += value * Math.sin(angle); }
      return Math.hypot(real, imaginary);
    }
    assert.ok(amplitude(880) > amplitude(220) * 20, 'Narration must replace background audio');
    const removed = await fetch(`${base}/api/jobs/${id}/media?kind=audio`, { method: 'DELETE' });
    assert.equal(removed.status, 200);
    assert.equal((await post(`/api/jobs/${id}/render`, { approved: true, voiceMode: 'USER_AUDIO' })).status, 400);
    await render('LOCAL_TTS');
    assert.equal(requests.length, requestCount, 'Removing upload must allow TTS segment cache reuse');
    console.log('Verified exact narration length, shared still, looping video, audio priority, subtitle timing, ranges, and cached TTS. Speech quality not tested (synthetic fixture).');
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    speech.closeAllConnections();
    await new Promise(resolve => speech.close(resolve));
    if (id) {
      const folder = path.join(root, 'temp', id);
      assert.equal(path.dirname(folder), path.join(root, 'temp'));
      await fs.rm(folder, { recursive: true, force: true });
      for (const suffix of ['.mp4', '.partial.mp4']) await fs.rm(path.join(root, 'output', id + suffix), { force: true });
    }
  }
});
