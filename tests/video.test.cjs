require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sceneSubtitles } = require('../src/server/video/subtitles.ts');
const { imageExtension, assetPath } = require('../src/server/video/job-assets.ts');
const { jobDir } = require('../src/server/filesystem/paths.ts');
const { createStoryboard } = require('../src/agents/storyboard/index.ts');
const { UserStoryProvider } = require('../src/providers/content/user-story-provider.ts');
const { estimateDuration, fitAudioDuration } = require('../src/core/narration/timing.ts');
const { storySubtitles } = require('../src/server/video/subtitles.ts');

test('Vietnamese subtitles escape ASS commands and page long text inside safe area', () => {
  const ass = sceneSubtitles('Bà mỉm cười. {\\pos(0,0)} ' + 'Một câu chuyện nhẹ nhàng. '.repeat(20), 12, true);
  assert.match(ass, /Bà mỉm cười/);
  assert.match(ass, /Default,Arial,64/);
  assert.doesNotMatch(ass, /[{}]/);
  const events = ass.split('\n').filter(line => line.startsWith('Dialogue:'));
  assert.ok(events.length > 1);
  assert.match(events[events.length - 1], /0:00:12\.00/);
  for (const event of events) assert.ok(event.split('\\N').length <= 3);
});

test('asset paths reject traversal and signatures reject disguised uploads', () => {
  assert.throws(() => jobDir('../output'));
  assert.throws(() => assetPath('4b262cdc-8fcb-4499-b0b2-051eb6a65f13', '../storyboard.json'));
  assert.throws(() => imageExtension(Buffer.from('<svg></svg>')));
  assert.equal(imageExtension(Buffer.from([137,80,78,71,13,10,26,10])), 'png');
  assert.equal(imageExtension(Buffer.from([255,216,255,1])), 'jpg');
});

test('full user story is preserved past ten sentences without extra hook, lesson, or CTA', async () => {
  const story = Array.from({ length: 23 }, (_, i) => `Đoạn truyện thứ ${i + 1} kết thúc nhẹ nhàng.`).join(' ');
  const config = { title: 'Truyện', audience: 'GENERAL', contentMode: 'USER_STORY', imageMode: 'USER_UPLOAD', voiceMode: 'NONE', mediaMode: 'IMAGE_VIDEO', durationSeconds: 1, theme: 'Không đọc thêm chủ đề', story };
  const content = await new UserStoryProvider().generate(config);
  const board = await createStoryboard(config, content);
  assert.equal(board.scenes.length, 23);
  assert.equal(board.scenes.map(scene => scene.narration).join(' '), story);
  assert.ok(board.scenes.reduce((sum, scene) => sum + scene.duration, 0) > 1);
  assert.ok(estimateDuration(story, 'SENIOR') > estimateDuration(story, 'GENERAL'));
});

test('audio sets exact total and subtitles move to the next passage without gaps', () => {
  const scenes = [{ narration: 'Một câu ngắn.', subtitle: 'Một câu ngắn.', duration: 1 }, { narration: 'Một đoạn dài hơn với nhiều lời kể nhẹ nhàng.', subtitle: 'Một đoạn dài hơn với nhiều lời kể nhẹ nhàng.', duration: 1 }];
  fitAudioDuration(scenes, 7.25);
  assert.equal(scenes.reduce((sum, scene) => sum + scene.duration, 0), 7.25);
  assert.ok(scenes[1].duration > scenes[0].duration);
  const events = storySubtitles(scenes, false).split('\n').filter(line => line.startsWith('Dialogue:'));
  for (let i = 1; i < events.length; i++) assert.equal(events[i - 1].split(',')[2], events[i].split(',')[1]);
  assert.equal(events.at(-1).split(',')[2], '0:00:07.25');
});

test('streaming WAV unknown lengths are finalized before strict audio decoding', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const os = require('node:os');
  const { normalizeAudio } = require('../src/server/video/audio.ts');
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'buddhist-wav-'));
  try {
    const header = Buffer.alloc(44);
    header.write('RIFF'); header.writeUInt32LE(0xffffffff, 4); header.write('WAVEfmt ', 8);
    header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
    header.writeUInt32LE(24000, 24); header.writeUInt32LE(48000, 28);
    header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(0xffffffff, 40);
    const input = path.join(folder, 'stream.wav');
    const output = path.join(folder, 'decoded.pcm');
    await fs.writeFile(input, Buffer.concat([header, Buffer.alloc(12000)]));
    assert.equal(await normalizeAudio(input, output), 0.25);
    assert.equal((await fs.stat(output)).size, 12000);
  } finally {
    assert.equal(path.dirname(folder), os.tmpdir());
    await fs.rm(folder, { recursive: true, force: true });
  }
});

test('atomic metadata writes retry a transient Windows rename lock', async () => {
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const os = require('node:os');
  const { writeJson, readJson } = require('../src/server/filesystem/json-file.ts');
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'buddhist-json-'));
  const original = fs.rename;
  let calls = 0;
  try {
    fs.rename = async (...args) => {
      if (calls++ === 0) throw Object.assign(new Error('File is locked'), { code: 'EPERM' });
      return original(...args);
    };
    const file = path.join(folder, 'job.json');
    await writeJson(file, { status: 'VOICE' });
    assert.equal((await readJson(file)).status, 'VOICE');
    assert.equal(calls, 2);
    assert.deepEqual(await fs.readdir(folder), ['job.json']);
  } finally {
    fs.rename = original;
    assert.equal(path.dirname(folder), os.tmpdir());
    await fs.rm(folder, { recursive: true, force: true });
  }
});
