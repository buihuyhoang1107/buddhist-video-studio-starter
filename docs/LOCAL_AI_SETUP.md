# Dùng các repo AI trong workspace

Studio tự tìm `../ComfyUI` và `../VieNeu-TTS`, đọc `.env.local` làm cấu hình mặc định.
Trên UI, có thể lưu địa chỉ dịch vụ, checkpoint và giọng đọc; cấu hình đã lưu
ở `temp/studio-settings.json` được ưu tiên cho các lần tạo tiếp theo, không cần restart.
Không cần di chuyển hoặc tạo bản sao repo. Các biến môi trường shell được ưu tiên.
Node.js 20.12+ hỗ trợ việc đọc env của launcher.

## Chuẩn bị môi trường Python

Chỉ có source repo chưa đủ để chạy model. Tạo môi trường riêng cho từng công cụ.
Từ thư mục `D:\vibe-code-movie`:

```powershell
python -m venv ComfyUI/.venv
ComfyUI/.venv/Scripts/python.exe -m pip install -r ComfyUI/requirements.txt
python -m venv VieNeu-TTS/.venv
VieNeu-TTS/.venv/Scripts/python.exe -m pip install -e ./VieNeu-TTS
VieNeu-TTS/.venv/Scripts/python.exe -m pip install fastapi uvicorn python-multipart
```

ComfyUI có hướng dẫn PyTorch riêng theo GPU trong `../ComfyUI/README.md`.
Nếu chạy CPU, đặt `COMFYUI_CPU=true` trong `.env.local`; VieNeu mặc định ONNX CPU.
Lần chạy VieNeu đầu tiên có thể tải model. Chất lượng và tốc độ cần kiểm tra trên máy thật.

## Cấu hình ComfyUI

Đặt checkpoint tương thích với `CheckpointLoaderSimple` (ví dụ loại SD/SDXL) vào
`../ComfyUI/models/checkpoints/`, chọn đúng tên file trong `.env.local`:

```env
ENABLE_COMFYUI=true
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_CHECKPOINT=ten-model-da-cai.safetensors
VIENEU_BASE_URL=http://127.0.0.1:8000
```

Studio không tự chọn hoặc tải checkpoint. Template mặc định tạo ảnh 768×1344, batch 1;
renderer tiếp tục xuất MP4 1080×1920. Không phải mọi họ model đều dùng được template này.
Với model khác, cung cấp workflow **API format** đã thử thành công trong ComfyUI qua
`COMFYUI_WORKFLOW` và node `SaveImage` qua `COMFYUI_OUTPUT_NODE` (mặc định `9`).
Template dùng các giá trị JSON nguyên vẹn `"{{PROMPT}}"`, `"{{SEED}}"` và tùy chọn
`"{{CHECKPOINT}}"`. Prompt bắt buộc; seed được thay bằng số ngẫu nhiên.
Không dùng JSON giao diện có `nodes`/`links`. Ảnh tham chiếu và character consistency chưa hỗ trợ.

Nếu repo hoặc Python nằm nơi khác, đặt `COMFYUI_REPO`, `VIENEU_REPO`,
`COMFYUI_PYTHON`, `VIENEU_PYTHON` thành đường dẫn tuyệt đối.
Launcher bind loopback; `*_BASE_URL` nên dùng `http://127.0.0.1:<port>` tương ứng.

## Tạo video trên UI

Sau khi cài dependency/model lần đầu, chạy studio bằng `npm run dev` và mở
`http://localhost:3000`. Các thao tác sản xuất video thực hiện trên màn hình:

1. Trong **Dịch vụ tạo ảnh và giọng đọc**, mở cấu hình, nhập địa chỉ rồi bấm
   **Lưu và kiểm tra kết nối**. Có nút **Khởi động ComfyUI** và **Khởi động VieNeu**
   cho môi trường Python đã cài tại máy. Dịch vụ cần thời gian tải model;
   bấm **Kiểm tra lại kết nối** để cập nhật. Thiếu Python/model sẽ được báo trên UI.
2. Chọn checkpoint từ danh sách ComfyUI, bật tạo ảnh, chọn giọng VieNeu và lưu.
   Ollama chỉ cần khi dùng chế độ AI viết truyện.
3. Nhập truyện/chủ đề, bấm **Tạo nội dung và chia đoạn**.
4. Upload một nền chung, upload ảnh riêng, hoặc **Tạo ảnh cho các đoạn còn thiếu**.
   Ảnh đã có được giữ; cảnh lỗi có thể thử lại, các cảnh thành công không tạo lại.
   **Tạo lại ảnh đoạn này** yêu cầu xác nhận trước khi thay ảnh. Có thể dừng hàng loạt
   sau ảnh đang tạo. Nếu dùng ảnh riêng, bỏ nền chung đã upload.
5. Bấm **Tạo và nghe giọng đọc** hoặc upload audio; nghe bằng player trên UI.
   Audio upload được giữ và ưu tiên; bỏ audio này trước khi chuyển sang VieNeu.
6. Duyệt lời kể/phụ đề/ảnh/audio, đánh dấu đồng ý, bấm **Tạo video MP4**.
   Theo dõi tiến độ, xem trước và **Tải MP4** tại màn hình.

Video đang mở tự phục hồi sau refresh; có thể mở video cũ bằng mã đã lưu.
Thao tác thay ảnh/audio/cấu hình bỏ xác nhận duyệt cũ. Dịch vụ AI không chạy
vẫn có thể tạo video bằng truyện nhập tay, ảnh/audio upload hoặc video không giọng đọc.
Các nút khởi động không cài Python/dependency/checkpoint tự động.

## CLI tùy chọn

Từ thư mục studio, mở ba terminal riêng:

```powershell
npm run comfyui
npm run tts
npm run dev
```

Kiểm tra bằng `npm run doctor`. Mã thoát 1 nghĩa là còn mục `MISSING`;
kiểm tra API không đồng nghĩa đã xác minh chất lượng ảnh/giọng hoặc checkpoint tương thích.
Khởi động lại studio sau khi đổi env.

1. Tạo storyboard ở giao diện, hoặc mở job cũ.
2. Đọc `GET http://127.0.0.1:3000/api/jobs/<jobId>/storyboard` để lấy scene ID.
3. Chạy `npm run image -- <jobId> <sceneId>`. Chỉ một cảnh được tạo.
   Thêm `--replace` để chủ động thay ảnh đã có, kể cả ảnh upload.
4. Mở lại job bằng ô **Tiếp tục job đã tạo** để tải ảnh mới và duyệt.
   Bỏ nền chung nếu muốn render ảnh riêng của từng cảnh.
5. Chọn VieNeu local hoặc upload audio, xác nhận duyệt rồi tạo MP4 như trước.

Lệnh `image` gọi `POST /api/jobs/:id/scenes/:sceneId/generate` với JSON
`{"replace":false}`. Có thể đặt `STUDIO_BASE_URL` nếu studio dùng cổng khác.
API trả storyboard mới khi thành công; HTTP 409 nếu cờ tắt, nội dung chưa qua
Dharma Review, job bận, hoặc ảnh đã có mà chưa yêu cầu thay. HTTP 502 khi provider lỗi.
Giới hạn tạo ảnh 10 phút, ảnh 10 MB, kiểm tra giải mã bằng FFmpeg trước khi lưu.
Nếu hết thời gian, prompt có thể vẫn chạy ở ComfyUI; studio không ngắt server dùng chung.
Lỗi không thay ảnh cũ hoặc các cảnh khác; upload thủ công vẫn hoạt động.
CLI không bắt buộc cho quy trình tạo video trên giao diện.

## Kiểm tra source

```powershell
npm run typecheck
npm test
$env:STUDIO_BUILD_DIR = '.next-validation'
npm run build
npm run test:narration
npm run test:ui
```

Test ComfyUI dùng server HTTP giả lập, kiểm tra submit/poll/download và giải mã PNG
thật bằng FFmpeg, bảo vệ ảnh upload, khóa job, retry, lỗi workflow và timeout.
Test narration và browser dùng âm thử, không thay cho việc nghe giọng VieNeu thật.
Browser test dùng Chrome đã cài tại máy: kiểm tra cấu hình UI, retry ảnh lỗi,
bảo vệ ảnh upload, nghe audio, xác nhận thay ảnh, xuất/tải MP4 thật, refresh và mobile.
Tiến độ công việc được ghi trong `../codex-workflow/CURRENT.md` và dashboard hiện có.
