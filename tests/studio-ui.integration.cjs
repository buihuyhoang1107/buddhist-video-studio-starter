const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function availablePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

test('UI settings → story → uploads/AI images → voice preview → approval → MP4 and restore', { timeout: 180000 }, async () => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-ui-'));
  const settingsFile = path.join(fixture, 'settings.json');
  const ffmpeg = require('ffmpeg-static');
  const png = execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=green:s=160x240', '-frames:v', '1', '-f', 'image2pipe', '-c:v', 'png', '-'], { windowsHide: true });
  const wav = execFileSync(ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=24000:duration=0.72', '-ac', '1', '-c:a', 'pcm_s16le', '-f', 'wav', '-'], { windowsHide: true });
  const state = { prompts: [], voiceCalls: [], failed: false };
  const ai = http.createServer(async (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/object_info/CheckpointLoaderSimple') {
      response.end(JSON.stringify({ CheckpointLoaderSimple: { input: { required: { ckpt_name: [['fixture.safetensors']] } } } }));
    } else if (request.url === '/v1/voices') {
      response.end(JSON.stringify({ data: [{ id: 'Hải Đăng', name: 'Hải Đăng' }, { id: 'Mai Anh', name: 'Mai Anh' }] }));
    } else if (request.url === '/api/tags') {
      response.end(JSON.stringify({ models: [{ name: 'fixture-model' }] }));
    } else if (request.url === '/prompt') {
      let raw = ''; for await (const chunk of request) raw += chunk;
      const prompt = JSON.parse(raw).prompt;
      assert.equal(prompt['4'].inputs.ckpt_name, 'fixture.safetensors');
      state.prompts.push(prompt);
      response.end(JSON.stringify({ prompt_id: String(state.prompts.length) }));
    } else if (request.url.startsWith('/history/')) {
      const id = request.url.split('/').at(-1);
      const failed = id === '2' && !state.failed;
      if (failed) state.failed = true;
      response.end(JSON.stringify({ [id]: { status: { completed: true, status_str: failed ? 'error' : 'success', messages: [['execution_error', { exception_message: 'fixture retry' }]] }, outputs: { '9': { images: [{ filename: 'fixture.png', subfolder: '', type: 'output' }] } } } }));
    } else if (request.url.startsWith('/view?')) {
      response.setHeader('Content-Type', 'image/png'); response.end(png);
    } else if (request.url === '/v1/audio/speech') {
      let raw = ''; for await (const chunk of request) raw += chunk;
      state.voiceCalls.push(JSON.parse(raw));
      response.setHeader('Content-Type', 'audio/wav'); response.end(wav);
    } else { response.writeHead(404); response.end('{}'); }
  });
  await new Promise(resolve => ai.listen(0, '127.0.0.1', resolve));
  const aiBase = `http://127.0.0.1:${ai.address().port}`;
  const port = await availablePort();
  const base = `http://127.0.0.1:${port}`;
  let child, browser, jobId, logs = '';
  try {
    child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(port)], {
      cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, STUDIO_BUILD_DIR: '.next-validation', STUDIO_SETTINGS_PATH: settingsFile, COMFYUI_BASE_URL: aiBase, VIENEU_BASE_URL: aiBase, OLLAMA_BASE_URL: aiBase, COMFYUI_CHECKPOINT: '', ENABLE_COMFYUI: 'false', VIENEU_API_KEY: '', VIENEU_PYTHON: path.join(fixture, 'not-installed.exe') }
    });
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { logs = (logs + chunk).slice(-15000); });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; } } catch {}
      await delay(200);
    }
    assert.ok(ready, logs);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(base);
    await page.getByText('ComfyUI đã kết nối.', { exact: false }).waitFor();
    // Configure everything through the UI; the API and .env are not edited by the test.
    await page.getByText('Cấu hình dịch vụ, checkpoint và giọng đọc', { exact: true }).click();
    await page.getByLabel('Dùng ComfyUI để tạo ảnh').check();
    await page.getByRole('combobox', { name: 'Checkpoint tạo ảnh', exact: true }).fill('fixture.safetensors');
    await page.getByRole('combobox', { name: 'Giọng đọc VieNeu', exact: true }).fill('Mai Anh');
    await page.getByRole('combobox', { name: 'Model viết truyện', exact: true }).fill('fixture-model');
    await page.getByLabel('Địa chỉ VieNeu', { exact: true }).fill('not-a-url');
    await page.getByRole('button', { name: 'Lưu và kiểm tra kết nối', exact: true }).click();
    await page.getByText('Nhập địa chỉ HTTP hợp lệ.', { exact: true }).waitFor();
    await page.getByLabel('Địa chỉ VieNeu', { exact: true }).fill(aiBase);
    await page.getByRole('button', { name: 'Lưu và kiểm tra kết nối', exact: true }).click();
    await page.getByText('Đã lưu cấu hình và kiểm tra kết nối.', { exact: false }).waitFor();
    assert.equal(JSON.parse(await fs.readFile(settingsFile, 'utf8')).vieneuVoice, 'Mai Anh');

    await page.getByRole('button', { name: 'Tạo nội dung và chia đoạn', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo ảnh cho các đoạn còn thiếu', exact: true }).waitFor();
    jobId = await page.evaluate(() => localStorage.getItem('video-studio-job'));
    assert.match(jobId, /^[0-9a-f-]{36}$/);
    await page.locator('input[accept="image/png,image/jpeg,image/webp"]').first().setInputFiles({ name: 'manual.png', mimeType: 'image/png', buffer: png });
    await page.getByAltText('Ảnh đoạn 1', { exact: true }).waitFor();
    const manualUrl = await page.getByAltText('Ảnh đoạn 1', { exact: true }).getAttribute('src');
    await page.getByRole('button', { name: 'Tạo ảnh cho các đoạn còn thiếu', exact: true }).click();
    await page.getByText('fixture retry', { exact: false }).waitFor();
    assert.equal(await page.getByAltText('Ảnh đoạn 1', { exact: true }).getAttribute('src'), manualUrl);
    await page.getByRole('button', { name: 'Tạo ảnh cho các đoạn còn thiếu', exact: true }).click();
    await page.getByAltText('Ảnh đoạn 4', { exact: true }).waitFor();
    assert.equal(state.prompts.length, 4); // One failed call, three generated scenes, uploaded scene untouched.
    const createImages = page.getByRole('button', { name: 'Tạo ảnh cho các đoạn còn thiếu', exact: true });
    await createImages.waitFor();
    assert.equal(await createImages.isDisabled(), true);

    // An explicit replacement asks for confirmation and only changes the selected scene.
    await page.getByRole('button', { name: 'Tạo lại ảnh đoạn này', exact: true }).first().click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('button', { name: 'Giữ ảnh hiện tại', exact: true }).click();
    assert.equal(state.prompts.length, 4);
    await page.getByRole('button', { name: 'Tạo lại ảnh đoạn này', exact: true }).last().click();
    await page.getByRole('button', { name: 'Tạo ảnh thay thế', exact: true }).click();
    await page.waitForFunction(() => !document.body.textContent.includes('Đang tạo ảnh…'));
    assert.equal(state.prompts.length, 5);
    assert.equal(await page.getByAltText('Ảnh đoạn 1', { exact: true }).getAttribute('src'), manualUrl);

    await page.getByRole('button', { name: 'Tạo và nghe giọng đọc', exact: true }).click();
    await page.locator('audio').waitFor();
    assert.equal(state.voiceCalls.length, 4);
    assert.ok(state.voiceCalls.every(request => request.voice === 'Mai Anh'));
    const render = page.getByRole('button', { name: 'Tạo video MP4', exact: true });
    assert.equal(await render.isDisabled(), true);
    await page.getByRole('checkbox', { name: 'Tôi đã duyệt lời kể', exact: false }).check();
    await render.click();
    await page.getByRole('link', { name: 'Tải MP4', exact: true }).waitFor({ timeout: 60000 });
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Tải MP4', exact: true }).click();
    const downloaded = await download;
    assert.ok((await fs.stat(await downloaded.path())).size > 1000);
    const output = path.join(root, 'output', `${jobId}.mp4`);
    execFileSync(ffmpeg, ['-v', 'error', '-xerror', '-i', output, '-f', 'null', '-'], { windowsHide: true });
    const voiceCount = state.voiceCalls.length;
    await page.reload();
    await page.getByRole('link', { name: 'Tải MP4', exact: true }).waitFor();
    assert.equal(state.voiceCalls.length, voiceCount);
    assert.equal(await page.getByRole('checkbox', { name: 'Tôi đã duyệt lời kể', exact: false }).isChecked(), false);
    // Missing Python is reported inside the UI without launching arbitrary processes.
    await page.getByText('Cấu hình dịch vụ, checkpoint và giọng đọc', { exact: true }).click();
    await page.getByLabel('Địa chỉ VieNeu', { exact: true }).fill('http://127.0.0.1:1');
    await page.getByRole('button', { name: 'Lưu và kiểm tra kết nối', exact: true }).click();
    await page.getByText('Chưa kết nối được VieNeu.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Khởi động VieNeu', exact: true }).click();
    await page.getByText('Chưa có môi trường Python cho VieNeu.', { exact: false }).waitFor();
    await page.getByLabel('Địa chỉ VieNeu', { exact: true }).fill(aiBase);
    await page.getByRole('button', { name: 'Lưu và kiểm tra kết nối', exact: true }).click();
    await page.getByText('VieNeu đã kết nối.', { exact: false }).waitFor();
    await page.getByText('Cấu hình dịch vụ, checkpoint và giọng đọc', { exact: true }).click();
    // The manual narration path remains available and clears the old approval.
    await page.locator('input[accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac"]').setInputFiles({ name: 'manual.wav', mimeType: 'audio/wav', buffer: wav });
    await page.getByText('Audio bạn upload được ưu tiên.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Tôi đã duyệt lời kể', exact: false }).isChecked(), false);
    await page.getByRole('button', { name: 'Bỏ audio hiện tại', exact: true }).click();
    await page.locator('audio').waitFor({ state: 'detached' });
    assert.equal(state.voiceCalls.length, voiceCount);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'mobile view must not overflow');
    assert.deepEqual(pageErrors, []);
    await page.screenshot({ path: path.join(root, 'temp', 'studio-ui-preview.png'), fullPage: true });
    console.log('Verified UI configuration, partial-image retry, manual override, single-scene replacement, real FFmpeg MP4/download, voice preview, refresh and mobile layout. AI model quality not tested.');
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    await browser?.close();
    if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
    ai.closeAllConnections();
    await new Promise(resolve => ai.close(resolve));
    if (jobId) {
      const folder = path.resolve(root, 'temp', jobId);
      assert.equal(path.dirname(folder), path.join(root, 'temp'));
      await fs.rm(folder, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      await fs.rm(path.join(root, 'output', `${jobId}.mp4`), { force: true });
    }
    assert.equal(path.dirname(fixture), os.tmpdir());
    await fs.rm(fixture, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
