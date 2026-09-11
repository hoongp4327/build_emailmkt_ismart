# iSMART Email Builder

Công cụ React + Vite để dán nội dung văn bản, xem trước email iLEAD và sao chép rich HTML trực tiếp vào Gmail.

## Chạy trên máy

```bash
pnpm install
pnpm dev
```

## Build production

```bash
pnpm build
pnpm preview
```

Thư mục đầu ra là `dist/`.

## Deploy Netlify

1. Đẩy thư mục dự án lên GitHub/GitLab.
2. Trong Netlify chọn **Add new site → Import an existing project**.
3. Build command: `pnpm build`.
4. Publish directory: `dist`.

File `netlify.toml` đã khai báo sẵn hai giá trị này.

## Cách sử dụng

1. Dán nội dung vào vùng **Nội dung email**.
2. Dùng `##` cho tiêu đề khu vực, `###` cho tiêu đề phụ, `📌` hoặc `✓` cho dòng thông tin.
3. Kiểm tra preview máy tính/điện thoại.
4. Nhấn **Sao chép cho Gmail** rồi dán bằng `Ctrl+V` vào cửa sổ soạn thư Gmail.

Nội dung chữ và các URL ảnh được lưu trong `localStorage` của trình duyệt. Khi chọn hoặc kéo thả ảnh, file ảnh được gửi qua Netlify Function đến Cloudinary; nội dung chữ không được gửi kèm.

## Tải ảnh từ máy

Mở **Cài đặt hình ảnh**, kéo ảnh vào ô Banner, Ảnh minh họa lợi ích hoặc Mascot iSSACC. Hỗ trợ JPG, PNG, WebP tối đa 4 MiB/file. Khi tải xong, URL HTTPS tự cập nhật trong preview, bản sao chép Gmail và HTML tải về. Có thể tiếp tục dán URL thủ công.

Ảnh được lưu công khai trên Cloudinary trong `emailmkt-ismart`, mỗi lần upload tạo một ID mới. Thay ảnh trong app không xóa ảnh cũ, vì email đã gửi vẫn dùng URL cũ. Không upload tài liệu hoặc ảnh cần giữ riêng tư.

### Cấu hình Netlify

Thêm các biến sau trong Netlify Project configuration → Environment variables, với scope **Functions** (hoặc All scopes) và context **Production**, rồi deploy lại:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Không dùng tiền tố `VITE_` cho secret. Không cần upload preset. Function ký yêu cầu SHA-256 trên server, kiểm tra kích thước và chữ ký định dạng file, rồi upload bằng HTTPS; trình duyệt chỉ nhận URL ảnh. Không ghi secret hoặc phản hồi lỗi thô của Cloudinary vào log.

Endpoint `/api/upload-image?slot=banner|benefit|mascot` nhận POST với body là file ảnh, không phải JSON/base64. Giới hạn 4 MiB giúp nằm trong mức payload buffered của Netlify. Nguồn yêu cầu phải cùng origin. Quy tắc Netlify giới hạn 12 yêu cầu/phút cho mỗi IP/domain; đây không phải hệ thống đăng nhập hay hạn mức tổng của tài khoản. Website công khai vẫn cho phép khách truy cập tải ảnh; nếu chỉ dành cho nhân viên, quản trị viên cần giới hạn truy cập website. Không cung cấp API xóa ảnh.

### Chạy local và kiểm thử

`pnpm dev` chỉ chạy giao diện Vite. Để thử upload với server, dùng `netlify dev` sau khi đã cài Netlify CLI và liên kết đúng site bằng `netlify link`. Cấu hình local bằng biến môi trường hoặc file `.env` đã được Git bỏ qua; không đưa khóa thật vào repository.

`pnpm test` kiểm tra template email và upload handler bằng phản hồi Cloudinary mô phỏng, không cần secret và không tạo ảnh thật. `pnpm build` tạo frontend; Netlify sẽ bundle và deploy Function cùng website.
