require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ComfyUiClient } = require('../src/server/comfyui/client.ts');
const { generateSceneImage } = require('../src/server/comfyui/generate-scene.ts');
const { createJob, getJob } = require('../src/server/jobs/job-repository.ts');
const { jobDir, tempRoot } = require('../src/server/filesystem/paths.ts');
const { writeJson, readJson } = require('../src/server/filesystem/json-file.ts');
const { assetPath, lockJob, saveImage } = require('../src/server/video/job-assets.ts');
const { POST } = require('../src/app/api/jobs/[id]/scenes/[sceneId]/generate/route.ts');

test('ComfyUI per-scene flow preserves overrides, review gates and retryable failures', async () => {
  const png = execFileSync(require('ffmpeg-static'), ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=green:s=64x64', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], { windowsHide: true });
  const state = { mode: 'ok', polls: 0, submissions: 0, prompt: undefined };
  const server = http.createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/prompt') {
      state.submissions++;
      let body = '';
      for await (const chunk of request) body += chunk;
      state.prompt = JSON.parse(body).prompt;
      if (state.mode === 'reject') { response.writeHead(400); response.end(JSON.stringify({ error: 'checkpoint missing' })); return; }
      state.polls = 0;
      response.end(JSON.stringify({ prompt_id: 'prompt-id' }));
    } else if (request.url === '/history/prompt-id') {
      state.polls++;
      if (state.mode === 'wait' || (state.mode === 'poll' && state.polls === 1)) { response.end('{}'); return; }
      response.end(JSON.stringify({ 'prompt-id': {
        status: { completed: true, status_str: state.mode === 'error' ? 'error' : 'success', messages: [['execution_error', { exception_message: 'out of memory' }]] },
        outputs: state.mode === 'no-output' ? {} : { '9': { images: [{ filename: 'image 1.png', subfolder: 'studio', type: 'output' }] } }
      } }));
    } else if (request.url.startsWith('/view?')) {
      const url = new URL(request.url, 'http://localhost');
      assert.equal(url.searchParams.get('filename'), 'image 1.png');
      assert.equal(url.searchParams.get('subfolder'), 'studio');
      response.end(state.mode === 'corrupt' ? png.subarray(0, 8) : state.mode === 'large' ? Buffer.alloc(10 * 1024 * 1024 + 1) : png);
    } else { response.writeHead(404); response.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const names = ['COMFYUI_BASE_URL', 'COMFYUI_CHECKPOINT', 'COMFYUI_WORKFLOW', 'COMFYUI_OUTPUT_NODE', 'ENABLE_COMFYUI', 'STUDIO_SETTINGS_PATH'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  process.env.COMFYUI_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.COMFYUI_CHECKPOINT = 'local-model.safetensors';
  process.env.ENABLE_COMFYUI = 'true';
  delete process.env.COMFYUI_WORKFLOW;
  delete process.env.COMFYUI_OUTPUT_NODE;
  const id = randomUUID();
  const sceneId = randomUUID();
  const otherId = randomUUID();
  const folder = jobDir(id);
  process.env.STUDIO_SETTINGS_PATH = path.join(folder, 'studio-settings.json');
  const boardFile = path.join(folder, 'storyboard.json');
  const reviewFile = path.join(folder, 'dharma-review.json');
  const config = { title: 'Test', audience: 'CHILD', contentMode: 'USER_STORY', imageMode: 'MIXED', voiceMode: 'NONE', mediaMode: 'IMAGE_VIDEO', durationSeconds: 5 };
  const prompt = 'Một em bé "từ bi".\nPeaceful illustration, no text.';
  const scene = { id: sceneId, duration: 2, narration: 'Lời kể.', subtitle: 'Lời kể.', visualPrompt: prompt, imageSource: 'GENERATE' };
  try {
    await createJob(id, config);
    await writeJson(boardFile, { title: 'Test', scenes: [scene, { ...scene, id: otherId }] });
    await writeJson(reviewFile, { approved: false });
    await assert.rejects(generateSceneImage(id, sceneId), /Dharma Review/);
    assert.equal(state.submissions, 0);
    await writeJson(reviewFile, { approved: true });
    process.env.ENABLE_COMFYUI = 'false';
    await assert.rejects(generateSceneImage(id, sceneId), /Bật ComfyUI/);
    process.env.ENABLE_COMFYUI = 'true';
    const unlock = await lockJob(id);
    try { await assert.rejects(generateSceneImage(id, sceneId), /đang upload hoặc render/); }
    finally { await unlock(); }
    delete process.env.COMFYUI_CHECKPOINT;
    await assert.rejects(generateSceneImage(id, sceneId), /checkpoint/);
    process.env.COMFYUI_CHECKPOINT = 'local-model.safetensors';
    state.mode = 'poll';
    const view = await generateSceneImage(id, sceneId);
    assert.match(view.scenes[0].imageUrl, /\/image\?v=/);
    assert.equal(state.polls, 2);
    assert.equal(state.prompt['6'].inputs.text, prompt);
    assert.equal(state.prompt['4'].inputs.ckpt_name, 'local-model.safetensors');
    assert.equal(typeof state.prompt['3'].inputs.seed, 'number');
    let board = await readJson(boardFile);
    assert.deepEqual(board.scenes[1], { ...scene, id: otherId });
    const original = board.scenes[0].imagePath;
    assert.deepEqual(await fs.readFile(assetPath(id, original)), png);
    await assert.rejects(generateSceneImage(id, sceneId), /replace=true/);
    for (const mode of ['error', 'reject', 'no-output', 'corrupt', 'large']) {
      state.mode = mode;
      await assert.rejects(generateSceneImage(id, sceneId, true), /Tạo ảnh thất bại/);
      board = await readJson(boardFile);
      assert.equal(board.scenes[0].imagePath, original);
      // Windows may keep a successfully unlinked file visible briefly while scanners release it.
      let images;
      for (let attempt = 0; attempt < 20; attempt++) {
        images = await fs.readdir(path.join(folder, 'images'));
        if (images.length === 1) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.deepEqual(images, [original], `cleanup after ${mode}`);
      await assert.rejects(fs.access(path.join(folder, 'video.lock')));
    }
    state.mode = 'wait';
    await assert.rejects(new ComfyUiClient().generate({}, '9', AbortSignal.timeout(50)), /abort|timeout/i);
    state.mode = 'ok';
    await saveImage(id, sceneId, new File([png], 'manual.png'));
    board = await readJson(boardFile);
    const uploaded = board.scenes[0].imagePath;
    await assert.rejects(generateSceneImage(id, sceneId), /replace=true/);
    assert.equal((await readJson(boardFile)).scenes[0].imageSource, 'USER_ASSET');
    await generateSceneImage(id, sceneId, true);
    board = await readJson(boardFile);
    assert.notEqual(board.scenes[0].imagePath, uploaded);
    assert.equal(board.scenes[0].imageSource, 'GENERATE');
    await assert.rejects(fs.access(assetPath(id, uploaded)));
    assert.equal((await getJob(id)).status, 'IMAGES');
    const context = { params: Promise.resolve({ id, sceneId }) };
    for (const body of ['null', '[]', '{"replace":"true"}', 'invalid']) {
      const response = await POST(new Request('http://localhost/generate', { method: 'POST', body }), context);
      assert.equal(response.status, 400);
    }
    const response = await POST(new Request('http://localhost/generate', { method: 'POST', body: '{}' }), context);
    assert.equal(response.status, 409);
  } finally {
    for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    assert.equal(path.dirname(folder), tempRoot);
    await fs.rm(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
