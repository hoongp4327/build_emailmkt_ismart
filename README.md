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

Nội dung chỉ được lưu trong `localStorage` của trình duyệt, không gửi lên máy chủ.
