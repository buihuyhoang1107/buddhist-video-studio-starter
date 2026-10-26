// Runs against the local Next.js server; creates and deletes only its own UUID job.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const base = process.env.VIDEO_TEST_BASE_URL || 'http://localhost:3000';
const root = path.resolve(__dirname, '..');
const ffmpeg = require('ffmpeg-static');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test('upload → approval → render → range/download → per-scene replacement and cache reuse', { timeout: 240000 }, async () => {
  let id;
  let rendering = false;
  const json = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  async function waitFor(states) {
    for (let i = 0; i < 200; i++) {
      const response = await fetch(`${base}/api/jobs/${id}`);
      const job = await response.json();
      if (states.includes(job.status)) { rendering = false; return job; }
      await delay(500);
    }
    throw new Error('Job timeout');
  }
  async function upload(sceneId, bytes) {
    const data = new FormData();
    data.set('image', new Blob([bytes], { type: 'image/png' }), 'image.png');
    return fetch(`${base}/api/jobs/${id}/scenes/${sceneId}/image`, { method: 'POST', body: data });
  }
  try {
    const start = await json('/api/jobs/start', { title: 'Kiểm tra render', audience: 'CHILD', contentMode: 'USER_STORY', imageMode: 'USER_UPLOAD', voiceMode: 'NONE', mediaMode: 'IMAGE_VIDEO', durationSeconds: 6, theme: 'Lòng tốt', story: 'An rót nước cho bà. Bà mỉm cười.' });
    assert.equal(start.status, 202);
    id = (await start.json()).id;
    assert.equal((await waitFor(['IMAGES', 'FAILED'])).status, 'IMAGES');
    const board = await (await fetch(`${base}/api/jobs/${id}/storyboard`)).json();
    assert.ok(board.scenes.length >= 2);
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: false })).status, 400);
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: true })).status, 400);
    assert.equal((await upload(board.scenes[0].id, Buffer.from('<svg/>'))).status, 400);
    const image = execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=green:s=160x240', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], { windowsHide: true });
    for (const scene of board.scenes) assert.equal((await upload(scene.id, image)).status, 200);
    const preview = await fetch(`${base}/api/jobs/${id}/scenes/${board.scenes[0].id}/image`);
    assert.equal(preview.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await preview.arrayBuffer()), image);
    const reviewPath = path.join(root, 'temp', id, 'dharma-review.json');
    const review = await fs.readFile(reviewPath, 'utf8');
    await fs.writeFile(reviewPath, JSON.stringify({ approved: false }));
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: true })).status, 409);
    await fs.writeFile(reviewPath, review);
    const lock = path.join(root, 'temp', id, 'video.lock');
    await fs.writeFile(lock, '');
    assert.equal((await upload(board.scenes[0].id, image)).status, 409);
    await fs.unlink(lock);
    // A signed but corrupt PNG must fail at decode and remain retryable.
    assert.equal((await upload(board.scenes[0].id, image.subarray(0, 8))).status, 200);
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: true })).status, 202);
    rendering = true;
    assert.equal((await waitFor(['COMPLETED', 'FAILED'])).status, 'FAILED');
    assert.equal((await upload(board.scenes[0].id, image)).status, 200);
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: true })).status, 202);
    rendering = true;
    const result = await waitFor(['COMPLETED', 'FAILED']);
    assert.equal(result.status, 'COMPLETED', result.error);
    const output = path.join(root, 'output', `${id}.mp4`);
    const metadata = spawnSync(ffmpeg, ['-hide_banner', '-i', output, '-f', 'null', '-'], { encoding: 'utf8', windowsHide: true });
    assert.equal(metadata.status, 0, metadata.stderr);
    assert.match(metadata.stderr, /1080x1920/);
    assert.match(metadata.stderr, /25 fps/);
    const download = await fetch(`${base}/api/jobs/${id}/video?download=1`);
    assert.match(download.headers.get('content-disposition'), /attachment/);
    assert.equal((await download.arrayBuffer()).byteLength, (await fs.stat(output)).size);
    const range = await fetch(`${base}/api/jobs/${id}/video`, { headers: { Range: 'bytes=0-99' } });
    assert.equal(range.status, 206);
    assert.equal((await range.arrayBuffer()).byteLength, 100);
    assert.equal((await fetch(`${base}/api/jobs/${id}/video`, { headers: { Range: 'bytes=9999999999-' } })).status, 416);
    const cache = path.join(root, 'temp', id, 'render');
    const names = (await fs.readdir(cache)).filter(name => /^[a-f0-9]{64}\.mp4$/.test(name));
    const times = await Promise.all(names.map(async name => [name, (await fs.stat(path.join(cache, name))).mtimeMs]));
    const replacement = execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x240', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], { windowsHide: true });
    assert.equal((await upload(board.scenes[0].id, replacement)).status, 200);
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: true })).status, 202);
    rendering = true;
    const rerendered = await waitFor(['COMPLETED', 'FAILED']);
    assert.equal(rerendered.status, 'COMPLETED', rerendered.error);
    for (const [name, time] of times) assert.equal((await fs.stat(path.join(cache, name))).mtimeMs, time);
    assert.equal((await fs.readdir(cache)).filter(name => /^[a-f0-9]{64}\.mp4$/.test(name)).length, names.length + 1);
    // Legacy jobs keep the original storyboard and must explicitly consent to silence.
    const jobFile = path.join(root, 'temp', id, 'job.json');
    const legacy = JSON.parse(await fs.readFile(jobFile, 'utf8'));
    legacy.config.voiceMode = 'LOCAL_TTS';
    await fs.writeFile(jobFile, JSON.stringify(legacy));
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: true })).status, 400);
    assert.equal((await json(`/api/jobs/${id}/render`, { approved: true, withoutVoice: true })).status, 202);
    rendering = true;
    assert.equal((await waitFor(['COMPLETED', 'FAILED'])).status, 'COMPLETED');
    console.log(`Verified ${board.scenes.length} scenes, MP4 decode, retry, HTTP ranges, and single-scene regeneration.`);
  } finally {
    if (id && !rendering) {
      const folder = path.join(root, 'temp', id);
      assert.equal(path.dirname(folder), path.join(root, 'temp'));
      await fs.rm(folder, { recursive: true, force: true });
      await fs.rm(path.join(root, 'output', `${id}.mp4`), { force: true });
      await fs.rm(path.join(root, 'output', `${id}.partial.mp4`), { force: true });
    }
  }
});
