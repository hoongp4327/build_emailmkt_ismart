# PRD — iSMART Email Builder v2 (Block Editor + Rich Text + Ảnh tự do + Khối Chuyển khoản QR)

> Tài liệu này dành cho AI coding agent (Antigravity). Đọc HẾT tài liệu trước khi code. Làm theo từng Phase, xong Phase nào chạy test + báo cáo Phase đó rồi mới sang Phase tiếp theo.
> Repo hiện tại: https://github.com/hoongp4327/build_emailmkt_ismart

---

## 0. Bối cảnh — app hiện tại đang làm gì

Stack hiện tại (GIỮ NGUYÊN): React + Vite, deploy Netlify, upload ảnh qua Netlify Function `netlify/functions/upload-image.mjs` → Cloudinary. Package manager: pnpm. Node >= 22.

Luồng hiện tại:
1. Người dùng dán văn bản thuần vào 1 textarea, dùng cú pháp kiểu markdown (`##`, `###`, `📌`, `✓`, `**bold**`, `[CTA: label|url|align]`).
2. `src/emailTemplate.js` → `parseDocument()` tách section theo `##`, rồi `buildEmail()` chọn cách render mỗi section bằng cách **dò từ khóa trong tiêu đề** (`THÔNG TIN` → info card, `ĐỊNH HƯỚNG` → benefits + ảnh, `ƯU ĐÃI` → offer cards, `ĐĂNG KÝ` → registration + mascot, còn lại → generic).
3. Output là HTML dạng table, inline style, rộng 640px; nút "Sao chép cho Gmail" ghi `text/html` vào clipboard; có "Tải HTML".
4. Ảnh chỉ có 3 slot cố định: `banner`, `benefit`, `mascot` (`src/uploadPolicy.js` → `IMAGE_SLOTS`). Function upload chặn mọi slot khác.

### Các bất cập cần giải quyết
| # | Vấn đề | Nguyên nhân gốc |
|---|--------|-----------------|
| 1 | Không chỉnh được font, cỡ chữ, màu, đậm/nhạt, nghiêng, gạch chân | Input là plain text, chỉ hỗ trợ `**bold**`; style hard-code trong template |
| 2 | Không thêm ảnh tự do, chỉ thay ảnh ở 3 vị trí có sẵn | Ảnh gắn cứng vào template, `IMAGE_SLOTS` cố định |
| 3 | Layout phụ thuộc từ khóa tiêu đề (đổi chữ "ƯU ĐÃI" là mất layout) | Render theo keyword thay vì theo kiểu khối người dùng chọn |
| 4 | Email có nội dung chuyển khoản nhưng không chèn được mã QR + thông tin ngân hàng | Không có khối ảnh tự do, không có khối thanh toán |

---

## 1. Mục tiêu v2

Chuyển app từ "dán text → template cứng" sang **Block Editor**: email = danh sách các khối (block) người dùng thêm / xóa / kéo thả sắp xếp / chỉnh style từng khối, trong đó text có định dạng rich text. Vẫn giữ được trải nghiệm "chỉ cần dán text là ra email đẹp" qua tính năng Import text.

Kết quả cuối cùng vẫn là: bấm **Sao chép cho Gmail** → Ctrl+V vào Gmail compose → hiển thị đúng, đẹp trên máy tính và điện thoại.

### Không làm trong v2 (out of scope)
- Không gửi email trực tiếp từ app, không quản lý danh sách người nhận.
- Không làm hệ thống đăng nhập / database. Lưu trữ vẫn là localStorage + Export/Import file JSON.
- Không cá nhân hóa QR theo từng người nhận.

---

## 2. LUẬT BẮT BUỘC cho HTML email output (đọc kỹ — vi phạm là email vỡ trong Gmail)

Đây là phần quan trọng nhất. Gmail/Outlook KHÔNG phải trình duyệt. Mọi HTML sinh ra để copy vào email phải tuân thủ:

1. **Layout bằng `<table role="presentation">`**, không dùng `display:flex`, `grid`, `position`, `float` trong output email.
2. **Mọi style phải inline** (`style="..."`). Khi paste vào Gmail, thẻ `<style>` và class bị bỏ. `<style>` trong bản "Tải HTML" chỉ dùng cho media query phụ trợ, email phải vẫn đọc được khi không có nó.
3. **Ảnh phải là URL HTTPS công khai** (Cloudinary). TUYỆT ĐỐI không dùng `data:` base64 hay `blob:` URL trong output — Gmail sẽ chặn/xóa ảnh. Nếu người dùng dán ảnh từ clipboard → phải upload lên Cloudinary trước rồi mới chèn URL.
4. Mọi `<img>` có: `width` attribute (số px), `style="display:block;max-width:100%;height:auto;border:0;"`, `alt` có nghĩa.
5. **Font: chỉ web-safe font**. Gmail không load web font (Google Fonts/@font-face). Danh sách font cho phép (đều hỗ trợ tiếng Việt có dấu):
   - `Arial, Helvetica, sans-serif` (mặc định)
   - `Tahoma, Geneva, sans-serif`
   - `Verdana, Geneva, sans-serif`
   - `'Trebuchet MS', Helvetica, sans-serif`
   - `Georgia, 'Times New Roman', serif`
   - `'Times New Roman', Times, serif`
   Luôn xuất đầy đủ font stack có fallback. UI chọn font phải hiển thị ghi chú: "Email chỉ dùng được font hệ thống để hiển thị đúng trong Gmail".
6. Chiều rộng email tối đa 640px, bảng ngoài `width:100%`. Khối 2 cột phải xếp chồng (stack) được trên mobile: dùng kỹ thuật `<td class="email-stack">` + media query (như code hiện tại) VÀ đảm bảo khi không có media query thì vẫn đọc được.
7. Màu viết bằng hex 6 ký tự. Không dùng CSS variable, `rgba()` hạn chế, không `background-image` cho nội dung quan trọng.
8. Escape toàn bộ nội dung người dùng (giữ lại hàm `escapeHtml`, `safeUrl` hiện có). Rich text phải được **sanitize theo whitelist** (xem mục 5.3), không cho lọt `<script>`, `on*=`, `javascript:`.
9. Không để nội dung quan trọng chỉ nằm trong ảnh (ví dụ số tài khoản): luôn có bản text song song vì nhiều client chặn ảnh mặc định.

---

## 3. Kiến trúc dữ liệu mới

Email được biểu diễn bằng 1 object JSON duy nhất (single source of truth). Renderer là **pure function** `renderEmail(doc) → { fragment, document, plainText }`.

```ts
type EmailDoc = {
  version: 2
  settings: {
    width: 640
    outerBg: string        // '#eef7fc'
    contentBg: string      // '#ffffff'
    fontFamily: FontStack  // mặc định Arial stack
    baseFontSize: number   // 14
    textColor: string      // '#254166'
    radius: number         // 22 — bo góc khung email
    palette: { navy, blue, orange, lime, pale }  // brand iSMART, lấy từ COLORS hiện tại
  }
  blocks: Block[]
}

type BlockBase = {
  id: string                     // nanoid
  type: BlockType
  style: {
    bg?: string
    paddingTop?: number; paddingBottom?: number; paddingX?: number   // mặc định 25/25/34
    align?: 'left' | 'center' | 'right' | 'justify'
    hidden?: boolean
  }
}
```

### Danh sách block types

| type | Mô tả | props chính |
|------|-------|-------------|
| `image` | Ảnh tự do, đặt ở bất kỳ đâu (banner cũng là block này) | `src, alt, width (px hoặc 'full'), align, link?, radius, caption?` |
| `heading` | Tiêu đề | `html` (rich text 1 dòng), `level: 1|2|3`, `color, fontSize` |
| `text` | Đoạn văn rich text | `html` (rich text nhiều đoạn) |
| `list` | Danh sách có icon | `items: {html}[]`, `marker: '📌'|'✓'|'•'|'⏰'|'☎'|'👉'|custom`, `markerColor` |
| `infoCard` | Thẻ có header màu + nội dung (thay renderInfo) | `title (rich), headerBg, headerColor, bodyBlocks: (text|list|button)[]` |
| `imageText` | 2 cột: text + ảnh (thay renderBenefits & renderRegistration) | `imagePosition: 'left'|'right', imageWidth, src, alt, contentBlocks[]` |
| `offerCards` | Khối ưu đãi header cam + các card con (thay renderOffer) | `title, subtitle (rich), cards: {title, contentBlocks[]}[]`, `columns: 1|2` |
| `button` | Nút CTA | `label, url, align, variant: 'outline'|'solid', color, fullWidth` |
| `payment` | **Khối chuyển khoản QR** (mục 6) | xem mục 6 |
| `divider` | Đường kẻ | `color, thickness, width%` |
| `spacer` | Khoảng trống | `height` |
| `footer` | Khối kết (thay closing line + "Trân trọng") | `html (rich), bg, color` |

Container block (`infoCard`, `imageText`, `offerCards`) chứa block con giới hạn trong: `text`, `list`, `button`, `image` (tối đa lồng 1 cấp).

### Lưu trữ
- localStorage key mới: `ismart-email-builder-v2`. Khi mở app lần đầu mà có key `ismart-email-builder-v1` → tự **migrate**: chạy importer text (mục 7) trên `content` cũ + map 3 ảnh cũ vào block tương ứng. Không xóa key v1.
- Nút **Xuất JSON** / **Nhập JSON** để lưu & chia sẻ mẫu email giữa đồng nghiệp.
- **Thư viện template**: thư mục `src/templates/*.json`. Template đầu tiên `ilead-offer.json` = tái tạo CHÍNH XÁC email iLEAD hiện tại bằng block. Template thứ 2 `payment-notice.json` = email thông báo học phí có khối chuyển khoản.

---

## 4. Cấu trúc thư mục đề xuất

```
src/
  model/
    types.js              // JSDoc typedef EmailDoc, Block
    defaults.js           // createBlock(type) trả về block mặc định
    migrate.js            // v1 → v2
  render/
    renderEmail.js        // entry: EmailDoc → {fragment, document, plainText}
    blocks/*.js           // mỗi block 1 file render
    richText.js           // sanitize + chuyển HTML từ editor sang inline-style email-safe
    helpers.js            // escapeHtml, safeUrl, table wrappers (chuyển từ emailTemplate.js)
  import/
    textImporter.js       // cú pháp ## ### 📌 ✓ ** [CTA] → blocks (tái sử dụng parser cũ)
  editor/
    BlockList.jsx         // danh sách block, kéo thả
    BlockToolbar.jsx      // thêm block (+), nhân bản, xóa, lên/xuống
    Inspector.jsx         // panel bên phải/dưới: chỉnh props + style của block đang chọn
    RichTextField.jsx     // wrapper TipTap
    ImagePicker.jsx       // upload / dán / kéo thả / nhập URL
    PaymentEditor.jsx
  templates/*.json
  App.jsx
```
Giữ `src/emailTemplate.js` cũ đến hết Phase 1 để so sánh output, sau đó xóa.

---

## 5. Tính năng chi tiết

### 5.1 Layout màn hình
3 vùng trên desktop:
- **Trái (≈ 300px)**: danh sách block dạng outline (icon + tên + preview 1 dòng), kéo thả sắp xếp, nút "+ Thêm khối" mở menu chọn loại block. Trên cùng có tab: `Khối` | `Nhập văn bản` | `Mẫu`.
- **Giữa**: Preview iframe (giữ switch Máy tính / Điện thoại như hiện tại). **Click vào 1 khối trong preview → chọn khối đó** (gắn `data-block-id` vào `<td>` gốc mỗi block chỉ trong bản preview, KHÔNG có trong bản copy).
- **Phải (≈ 340px)**: Inspector của block đang chọn: nội dung (rich text), style, ảnh.
- Topbar: Hoàn tác / Làm lại (Ctrl+Z / Ctrl+Shift+Z, lịch sử ≥ 50 bước), trạng thái lưu, Xuất/Nhập JSON, Tải HTML, **Sao chép cho Gmail** (nút chính).
Mobile/tablet < 1024px: 1 cột, Inspector thành bottom sheet.

### 5.2 Kéo thả
Dùng `@dnd-kit/core` + `@dnd-kit/sortable`. Hỗ trợ bàn phím (accessibility). Mỗi block có menu: Nhân bản, Ẩn/Hiện, Xóa (có undo), Lên, Xuống.

### 5.3 Rich text (giải quyết bất cập #1)
Dùng **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`, extensions: Underline, TextStyle, Color, FontFamily, Link, TextAlign, Highlight; font size dùng custom extension trên TextStyle).

Thanh công cụ rich text:
- Font family (dropdown chỉ 6 font ở mục 2.5)
- Cỡ chữ: 12 / 13 / 14 / 16 / 18 / 20 / 22 / 24 / 28 / 32 px
- **Độ đậm**: Thường (400) / Đậm (700). (Không cung cấp 300/500/600 vì font hệ thống trong email chỉ render ổn 400 và 700 — ghi tooltip giải thích.)
- Nghiêng, Gạch chân, Gạch ngang
- Màu chữ: palette brand iSMART (navy #082e6f, blue #0870c5, orange #ff641c, lime #80b600, text #254166, trắng, đen) + ô nhập hex
- Tô nền chữ (highlight)
- Line-height: 1.4 / 1.6 / 1.8
- Căn lề: trái / giữa / phải / đều
- Chèn link (validate qua `safeUrl`)
- Chèn emoji nhanh: 📌 ✓ ⏰ ☎ 👉 🎯 💰 🎁 📅
- Xóa định dạng

**Chuyển đổi sang email HTML** (`render/richText.js`):
- Whitelist thẻ: `p, br, strong, b, em, i, u, s, span, a`. Thẻ khác → unwrap giữ text.
- Whitelist thuộc tính style: `font-family, font-size, font-weight, font-style, text-decoration, color, background-color, line-height, text-align`. Loại bỏ mọi style khác.
- Chuyển mark thành inline style đầy đủ (vd `<strong>` → `<strong style="font-weight:700;font-family:...">`), vì Gmail đôi khi reset font trong thẻ con.
- Mỗi `<p>` phải có `margin:0 0 12px;` inline + font-family + font-size + line-height + color kế thừa từ settings nếu chưa có.
- Emoji bọc `<span style="font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;">` (giữ logic `renderHeadingText` cũ).
- Dán từ Word/Google Docs vào editor: làm sạch bằng cùng whitelist.

### 5.4 Ảnh tự do (giải quyết bất cập #2)
Block `image` + trường ảnh trong `imageText` dùng chung component `ImagePicker`:
- 4 cách đưa ảnh vào: **Chọn file**, **Kéo thả**, **Ctrl+V dán ảnh từ clipboard**, **Dán URL**.
- Trước khi upload: **nén/resize phía client** bằng canvas: cạnh dài tối đa 1280px (đủ nét retina cho khung 640), xuất JPEG q=0.85 nếu là ảnh chụp, giữ PNG nếu ảnh có alpha (mascot, QR). QR code: KHÔNG nén JPEG, KHÔNG resize nhỏ hơn 600px (giữ nét để quét).
- Hiển thị progress, lỗi bằng tiếng Việt, cho retry.
- Tùy chỉnh: chiều rộng (slider 10–100% hoặc nhập px, tối đa 640), căn lề, bo góc (0–24px), link khi click, alt text (bắt buộc — cảnh báo nếu trống), chú thích dưới ảnh.
- Kho ảnh gần đây: lưu 20 URL đã upload gần nhất trong localStorage để chọn lại nhanh.

**Sửa Netlify Function** `upload-image.mjs` + `uploadPolicy.js`:
- Bỏ whitelist `IMAGE_SLOTS` cứng. Thay bằng tham số `kind` với whitelist mới: `image | qr | banner | mascot` (chỉ dùng để đặt folder/tag trên Cloudinary: `emailmkt-ismart/<kind>`).
- Giữ nguyên toàn bộ biện pháp an toàn hiện có: check origin, check magic bytes, giới hạn 4 MiB, rate limit 12 req/phút, không log secret. Cập nhật test `tests/upload-image.test.mjs` tương ứng.

---

## 6. Khối Chuyển khoản / QR thanh toán (giải quyết bất cập #4)

### 6.1 Dữ liệu
```ts
type PaymentBlock = BlockBase & {
  type: 'payment'
  props: {
    title: string              // "THÔNG TIN CHUYỂN KHOẢN"
    bankName: string           // người dùng tự gõ, vd 'Vietcombank'
    accountNo: string
    accountName: string        // IN HOA không dấu, vd 'CONG TY CO PHAN ISMART'
    amount?: number            // VNĐ, có thể để trống
    transferContent: string    // nội dung CK, vd 'HOTEN_LOP_SDT'
    qrImageUrl: string         // URL Cloudinary của ảnh QR do người dùng tự upload
    qrSize: number             // mặc định 200px
    layout: 'qr-left' | 'qr-right' | 'qr-top'
    note?: string (rich)       // "Vui lòng ghi đúng nội dung chuyển khoản..."
    accentColor: string
  }
}
```

### 6.2 Nguồn ảnh QR — CHỈ do người dùng tự upload
- Người dùng đã có sẵn ảnh QR (xuất từ app ngân hàng / do kế toán cung cấp). App **KHÔNG tự tạo QR** dưới bất kỳ hình thức nào.
- Ảnh QR đưa vào bằng `ImagePicker` với `kind=qr` (chọn file, kéo thả, Ctrl+V, hoặc dán URL HTTPS).
- Với `kind=qr`: không nén JPEG, không resize nhỏ hơn 600px, giữ nguyên PNG và viền trắng (quiet zone) để app ngân hàng quét được.
- Các trường text (ngân hàng, STK, chủ TK, số tiền, nội dung CK) do người dùng tự gõ, app chỉ validate nhẹ: `accountNo` chỉ gồm số và khoảng trắng; `amount` là số nguyên dương; hiển thị cảnh báo nếu `transferContent` có dấu tiếng Việt (nhiều ngân hàng không nhận) nhưng KHÔNG tự sửa.
- KHÔNG được: gọi API vietqr.io hay bất kỳ dịch vụ sinh QR nào, cài thư viện sinh QR, tạo Function `qr-to-cloudinary.mjs`, tạo file danh sách ngân hàng.

### 6.3 Hiển thị trong email
Card bo góc nền `pale`, viền nhẹ, header màu `accentColor` chứa `title`. Thân card là bảng 2 cột (stack trên mobile):
- Cột QR: `<img>` QR width = `qrSize` (mặc định 200), nền trắng, padding 8px, dưới ảnh chữ nhỏ "Quét mã bằng app ngân hàng".
- Cột thông tin: bảng label/giá trị:
  - Ngân hàng: **Vietcombank**
  - Số tài khoản: **0123 456 789** (cỡ 18px, đậm, màu accent, nhóm 3–4 số cho dễ đọc)
  - Chủ tài khoản: **CONG TY CO PHAN ISMART**
  - Số tiền: **4.515.000 VNĐ** (format `vi-VN`; ẩn dòng nếu trống)
  - Nội dung CK: **HOTEN_LOP_SDT** (nền highlight, font monospace fallback `'Courier New', monospace`)
- Dòng `note` bên dưới.
- Layout `qr-top`: QR căn giữa trên, bảng thông tin dưới (tốt cho mobile).
- Luôn có bản text đầy đủ thông tin (luật 2.9) — thông tin text là bắt buộc, QR là bổ sung.

### 6.4 Inspector cho Payment
Form có label rõ ràng, preview QR thu nhỏ, nút "Thay ảnh QR", cảnh báo vàng nếu: thiếu nội dung CK, chưa có ảnh QR, ảnh QR < 600px gốc. Hiển thị ghi chú: "Kiểm tra nội dung chuyển khoản gõ ở đây khớp với nội dung đã gắn trong ảnh QR".

---

## 7. Import văn bản (giữ trải nghiệm "chỉ cần dán text")

Tab **Nhập văn bản**: textarea + nút "Chuyển thành khối" (có 2 lựa chọn: *Thay toàn bộ* / *Thêm vào cuối*).
Parser `textImporter.js` tái sử dụng cú pháp cũ và mở rộng:

| Cú pháp | Tạo block |
|---------|-----------|
| Các dòng trước `##` đầu tiên | `text` |
| `## Tiêu đề` | mặc định `infoCard`; nếu tiêu đề chứa `ƯU ĐÃI` → `offerCards`; `ĐỊNH HƯỚNG` → `imageText` ảnh phải; `ĐĂNG KÝ` → `imageText` + mascot (giữ tương thích mẫu iLEAD) |
| `### Tiêu đề` trong `ƯU ĐÃI` | 1 card con |
| Các dòng liên tiếp bắt đầu `📌 ✓ ⏰ ☎ 👉 - •` | gộp thành 1 `list` |
| `**chữ**` | rich text bold |
| `[CTA: label|url|align]` | `button` |
| `[IMG: url|alt|width]` *(mới)* | `image` |
| `[QR]` hoặc tiêu đề chứa `CHUYỂN KHOẢN` *(mới)* | `payment` (các dòng `Ngân hàng:`, `STK:`/`Số tài khoản:`, `Chủ TK:`, `Số tiền:`, `Nội dung:` được tự điền vào props) |
| `---` *(mới)* | `divider` |
| Dòng bắt đầu `Trân trọng` và dòng `Đăng ký ngay hôm nay...` | gộp vào `footer` |

Sau khi import, người dùng vẫn chỉnh từng block bình thường. Import là một chiều (không cần export ngược ra text).

---

## 8. Sao chép & xuất

- **Sao chép cho Gmail**: giữ cơ chế hiện có (`ClipboardItem` với `text/html` + `text/plain`, fallback `execCommand`). `text/plain` sinh từ blocks (không phải chuỗi gốc). Trước khi copy: kiểm tra (a) không còn ảnh đang upload, (b) không còn `data:`/`blob:` URL, (c) mọi ảnh có alt — nếu vi phạm hiện dialog cảnh báo.
- **Sao chép cho Outlook** (nút phụ): cùng HTML nhưng thêm thuộc tính `bgcolor` trên `<td>` và bỏ `border-radius` phụ thuộc — Outlook desktop bỏ qua bo góc; chỉ cần không vỡ layout.
- **Tải HTML**: file đầy đủ `<!doctype html>` như hiện tại.
- Hiển thị cảnh báo kích thước: nếu HTML fragment > 100KB → cảnh báo Gmail có thể cắt email ("[Message clipped]").

---

## 9. Kế hoạch triển khai theo Phase

Mỗi Phase: code → `pnpm test` pass → `pnpm build` pass → báo cáo ngắn (đã làm gì, file nào đổi, cần người dùng kiểm tra gì). Commit riêng mỗi Phase.

**Phase 1 — Data model + Renderer (chưa đụng UI)**
- Tạo `model/`, `render/`, `import/`. Chuyển helpers từ `emailTemplate.js`.
- Viết `templates/ilead-offer.json` và test: render ra HTML **tương đương về hiển thị** với `buildEmail(DEFAULT_CONTENT, DEFAULT_IMAGES)` cũ (so sánh text content + thứ tự khối + màu chính; không cần giống từng byte).
- Test unit cho mỗi block renderer: không có `flex|grid|data:|<script|javascript:` trong output; mọi `<img>` có `width` và `alt`.
- ✅ Xong khi: test pass, có script `pnpm render:sample` xuất `dist-sample/ilead.html` để mở xem.

**Phase 2 — Block Editor UI**
- Layout 3 vùng, danh sách block, thêm/xóa/nhân bản/kéo thả, Inspector cho style cơ bản, click-to-select trong preview, undo/redo, autosave v2, migrate v1.
- ✅ Xong khi: tạo được email từ con số 0 chỉ bằng click, reload trang không mất dữ liệu.

**Phase 3 — Rich text**
- TipTap + toolbar mục 5.3 + converter email-safe + sanitize paste từ Word/Docs.
- ✅ Xong khi: đổi font/cỡ/màu/đậm/nghiêng của 1 từ bất kỳ, copy vào Gmail vẫn giữ nguyên.

**Phase 4 — Ảnh tự do**
- `ImagePicker` 4 cách nhập, nén client, sửa Function `kind`, kho ảnh gần đây.
- ✅ Xong khi: chèn 3 ảnh ở 3 vị trí tùy ý, Ctrl+V ảnh chụp màn hình vào được, copy vào Gmail ảnh hiện đúng.

**Phase 5 — Khối Chuyển khoản**
- `payment` block (ảnh QR do người dùng upload) + render + Inspector + template `payment-notice.json`.
- Không có phần tự sinh QR.
- ✅ Xong khi: gửi email thử tới Gmail, mở trên điện thoại, **quét QR bằng app ngân hàng hiển thị đúng STK, tên, số tiền, nội dung**.

**Phase 6 — Import văn bản mở rộng + hoàn thiện**
- Parser mục 7, Xuất/Nhập JSON, thư viện mẫu, nút copy Outlook, cảnh báo trước khi copy, cập nhật README tiếng Việt.

---

## 10. Checklist QA thủ công (người dùng sẽ tự test)
- [ ] Paste vào Gmail web (Chrome) → gửi cho chính mình → mở trên Gmail web, Gmail app iOS, Gmail app Android.
- [ ] Mở trên Outlook web: không vỡ layout (bo góc mất là chấp nhận được).
- [ ] Chế độ tối (dark mode) Gmail app: chữ vẫn đọc được.
- [ ] Tắt hiển thị ảnh: email vẫn đủ thông tin chuyển khoản dạng text.
- [ ] Font khác nhau hiển thị đúng; tiếng Việt có dấu không lỗi.
- [ ] Quét ảnh QR (sau khi đã upload và copy vào Gmail) bằng ít nhất 2 app ngân hàng khác nhau — ảnh không bị mờ/nén hỏng.
- [ ] Khối 2 cột xếp chồng đúng trên điện thoại.

---

## 11. Quy tắc làm việc cho agent
- Chỉ thêm dependency cần thiết: `@tiptap/*`, `@dnd-kit/*`, `nanoid`. Không cài thư viện sinh QR. Pin version cụ thể (repo hiện dùng `"latest"` — đổi sang version cụ thể khi cài).
- Không đổi stack, không chuyển sang Next.js, không thêm backend ngoài Netlify Functions.
- Không đưa secret vào code; Cloudinary vẫn dùng biến môi trường `CLOUDINARY_*` như hiện tại.
- UI toàn bộ bằng tiếng Việt, giữ tone giao diện hiện có (`src/styles.css`, màu brand iSMART).
- Nếu gặp điểm chưa rõ trong tài liệu → chọn phương án đơn giản nhất, ghi lại giả định trong báo cáo Phase, KHÔNG tự ý mở rộng phạm vi.
- Không xóa tính năng đang chạy tốt (copy Gmail, tải HTML, upload Cloudinary, preview desktop/mobile).
