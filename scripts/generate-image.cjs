require('./local-tools.cjs');

async function main() {
  const [jobId, sceneId, option] = process.argv.slice(2);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(jobId || '') || !uuid.test(sceneId || '') || (option && option !== '--replace')) {
    throw new Error('Dùng: npm run image -- <jobId> <sceneId> [--replace]. Xem sceneId ở GET /api/jobs/<jobId>/storyboard.');
  }
  const base = (process.env.STUDIO_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  console.log('Đang tạo ảnh cho một cảnh bằng ComfyUI…');
  const response = await fetch(`${base}/api/jobs/${jobId}/scenes/${sceneId}/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replace: option === '--replace' }),
    signal: AbortSignal.timeout(660000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
  const scene = result.scenes.find(item => item.id === sceneId);
  console.log(`Đã lưu ảnh: ${base}${scene.imageUrl}`);
  console.log('Mở lại job trong studio để duyệt ảnh, rồi tạo MP4. Nền chung cần được bỏ nếu muốn dùng ảnh riêng từng cảnh.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
