require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sceneSubtitles } = require('../src/server/video/subtitles.ts');
const { imageExtension, assetPath } = require('../src/server/video/job-assets.ts');
const { jobDir } = require('../src/server/filesystem/paths.ts');

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
