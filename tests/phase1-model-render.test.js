import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBlock, createDefaultDoc, BRAND_COLORS, SAFE_FONTS } from '../src/model/defaults.js'
import { migrateV1toV2 } from '../src/model/migrate.js'
import { renderEmail } from '../src/render/renderEmail.js'
import { resolveFontStack, isValidHttpUrl, safeUrl } from '../src/render/helpers.js'
import { sanitizeAndInlineRichText, extractPlainText } from '../src/render/richText.js'
import { importTextToBlocks } from '../src/import/textImporter.js'
import { buildEmail } from '../src/emailTemplate.js'
import { DEFAULT_CONTENT, DEFAULT_IMAGES } from '../src/defaultContent.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

// 1. Bảo mật: XSS, onerror, javascript:, <script> bị escape hoặc loại bỏ
test('Bảo mật XSS: Thẻ script, handler on*, javascript: bị loại bỏ hoặc escape hoàn toàn', () => {
  const maliciousDoc = createDefaultDoc({}, [
    createBlock('heading', {
      html: 'Tiêu đề <script>alert("XSS1")</script><img src="x" onerror="alert(\'XSS2\')">',
    }, {}, 'test-h1'),
    createBlock('text', {
      html: '<p>Đoạn văn <script>alert("XSS3")</script><a href="javascript:alert(\'XSS4\')">Bấm vào đây</a></p>',
    }, {}, 'test-p1'),
    createBlock('button', {
      label: 'Nút nguy hiểm',
      url: 'javascript:alert("XSS5")',
    }, {}, 'test-b1'),
    createBlock('image', {
      src: 'javascript:alert("XSS6")',
      alt: 'Test',
    }, {}, 'test-img1'),
    createBlock('payment', {
      title: 'CK',
      bankName: 'VCB <script>alert("XSS7")</script>',
      accountNo: '123456',
      accountName: 'TEST',
      transferContent: 'PAY<script>',
      qrImageUrl: 'javascript:alert("XSS8")',
    }, {}, 'test-pay1'),
  ])

  const { fragment, document } = renderEmail(maliciousDoc)

  for (const html of [fragment, document]) {
    assert.ok(!html.includes('<script>'), 'Không được chứa thẻ <script>')
    assert.ok(!html.includes('</script>'), 'Không được chứa thẻ </script>')
    assert.ok(!html.includes('XSS1'), 'Nội dung script 1 phải bị loại bỏ')
    assert.ok(!html.includes('XSS3'), 'Nội dung script 3 phải bị loại bỏ')
    assert.ok(!html.includes('onerror='), 'Không được chứa attribute onerror=')
    assert.ok(!html.includes('javascript:'), 'Không được chứa URL javascript:')
  }
})

// 2. Font fallback: Font ngoài 6 font cho phép thì tự fallback về Arial stack
test('Font fallback: Font lạ tự động fallback về Arial stack', () => {
  assert.equal(resolveFontStack('Comic Sans MS'), 'Arial, Helvetica, sans-serif')
  assert.equal(resolveFontStack('Roboto, sans-serif'), 'Arial, Helvetica, sans-serif')
  assert.equal(resolveFontStack('Times New Roman, serif'), "'Times New Roman', Times, serif")
  assert.equal(resolveFontStack('Tahoma'), 'Tahoma, Geneva, sans-serif')

  const docWithCustomFont = createDefaultDoc({
    fontFamily: 'Open Sans, sans-serif',
  }, [
    createBlock('text', { html: '<p>Kiểm tra font</p>' }, {}, 'font-test-1'),
  ])

  const { document } = renderEmail(docWithCustomFont)
  assert.match(document, /font-family:Arial, Helvetica, sans-serif/)
  assert.ok(!document.includes('Open Sans'))
})

// 3. Quy tắc ảnh: Block không có URL ảnh hợp lệ thì KHÔNG render thẻ <img> (không để src rỗng)
test('Quy tắc ảnh: Không render <img> khi URL rỗng, không hợp lệ, hoặc base64', () => {
  const docWithEmptyImages = createDefaultDoc({}, [
    createBlock('image', { src: '', alt: 'Rỗng' }, {}, 'img-empty'),
    createBlock('image', { src: 'data:image/png;base64,iVBORw0KGgo...', alt: 'Base64' }, {}, 'img-base64'),
    createBlock('image', { src: 'blob:http://localhost/123', alt: 'Blob' }, {}, 'img-blob'),
    createBlock('imageText', {
      src: '',
      alt: 'Ảnh minh họa',
      contentBlocks: [createBlock('text', { html: '<p>Nội dung 2 cột không có ảnh</p>' }, {}, 'sub-txt')],
    }, {}, 'imgtext-empty'),
  ])

  const { fragment } = renderEmail(docWithEmptyImages)
  assert.ok(!fragment.includes('<img'), 'Không được có bất kỳ thẻ <img> nào khi src rỗng hoặc không hợp lệ')
  assert.ok(!fragment.includes('src=""'), 'Tuyệt đối không có src="" rỗng')
})

// 4. Khối Payment: Thiếu QR vẫn render đầy đủ thông tin chuyển khoản dạng text (STK nguyên văn)
test('Khối Payment: Thiếu QR vẫn render đầy đủ 100% bảng thông tin chuyển khoản và giữ nguyên văn STK', () => {
  const paymentDoc = createDefaultDoc({}, [
    createBlock('payment', {
      title: 'THÔNG TIN CHUYỂN KHOẢN HỌC PHÍ',
      bankName: 'Ngân hàng Quân Đội (MB Bank)',
      accountNo: '0987654321',
      accountName: 'CONG TY CO PHAN ISMART',
      amount: 4515000,
      transferContent: 'NGUYENVANA_LOP1A_0901234567',
      qrImageUrl: '', // Không có QR
      note: 'Vui lòng kiểm tra kỹ nội dung chuyển khoản trước khi xác nhận.',
    }, {}, 'pay-no-qr'),
  ])

  const { fragment, plainText } = renderEmail(paymentDoc)

  // Không có img
  assert.ok(!fragment.includes('<img'), 'Không render <img> khi không có QR')
  // Nhưng vẫn đủ các trường text
  assert.ok(fragment.includes('Ngân hàng Quân Đội (MB Bank)'))
  // BẮT BUỘC: Giữ nguyên văn STK người dùng gõ, KHÔNG tự ý chèn khoảng trắng làm sai khi copy-paste
  assert.ok(fragment.includes('0987654321'))
  assert.ok(!fragment.includes('0987 654 321'), 'Không được tự động thêm khoảng trắng vào STK')
  assert.ok(fragment.includes('CONG TY CO PHAN ISMART'))
  assert.ok(fragment.includes('4.515.000 VNĐ'))
  assert.ok(fragment.includes('NGUYENVANA_LOP1A_0901234567'))
  assert.ok(fragment.includes('Vui lòng kiểm tra kỹ nội dung'))

  // plainText cũng phải đầy đủ
  assert.ok(plainText.includes('Ngân hàng Quân Đội (MB Bank)'))
  assert.ok(plainText.includes('0987654321'))
  assert.ok(plainText.includes('4.515.000 VNĐ'))
  assert.ok(plainText.includes('NGUYENVANA_LOP1A_0901234567'))
})

// 4b. Sanitize thuộc tính: Chỉ giữ style hợp lệ và href an toàn (thẻ a); loại bỏ on*, class, id, url(), expression()
test('Sanitize thuộc tính: Chỉ giữ style (whitelist) và href (thẻ a); loại bỏ class, id, on*, url(), expression()', () => {
  const dirtyHtml = `
    <p class="alert-box" id="p1" onclick="alert('hack')" data-attr="test" style="color:#0870c5; background-image:url('https://evil.com/leak'); font-size:16px; width:expression(alert(1));">
      Đoạn văn an toàn
      <strong id="strong1" onmouseover="steal()" style="font-weight:bold; cursor:pointer;">chữ đậm</strong>
      <a href="https://example.com/ok" class="btn" id="link1" onclick="evil()" style="color:#ff641c;">Liên kết tốt</a>
      <a href="javascript:alert('xss')" id="link2">Liên kết xấu</a>
    </p>
  `

  const sanitized = sanitizeAndInlineRichText(dirtyHtml)

  // Kiểm tra loại bỏ triệt để các thuộc tính cấm
  assert.ok(!sanitized.includes('class='), 'Phải loại bỏ thuộc tính class')
  assert.ok(!sanitized.includes('alert-box'), 'Phải loại bỏ giá trị class')
  assert.ok(!sanitized.includes('id='), 'Phải loại bỏ thuộc tính id')
  assert.ok(!sanitized.includes('onclick='), 'Phải loại bỏ thuộc tính onclick')
  assert.ok(!sanitized.includes('onmouseover='), 'Phải loại bỏ thuộc tính onmouseover')
  assert.ok(!sanitized.includes('data-attr='), 'Phải loại bỏ thuộc tính data-*')

  // Kiểm tra loại bỏ url(), expression() trong style
  assert.ok(!sanitized.includes('url('), 'Phải loại bỏ url() trong style')
  assert.ok(!sanitized.includes('expression('), 'Phải loại bỏ expression() trong style')
  assert.ok(!sanitized.includes('evil.com'), 'Không được rò rỉ URL trong style')

  // Kiểm tra style hợp lệ được giữ lại
  assert.ok(sanitized.includes('color:#0870c5'), 'Giữ lại color hợp lệ')
  assert.ok(sanitized.includes('font-size:16px'), 'Giữ lại font-size hợp lệ')
  assert.ok(sanitized.includes('font-weight:700'), 'Giữ lại font-weight 700')

  // Thẻ a: href an toàn được giữ, javascript: bị loại/thay thế bằng fallback #
  assert.ok(sanitized.includes('href="https://example.com/ok"'), 'Giữ href an toàn')
  assert.ok(!sanitized.includes('href="javascript:'), 'Loại bỏ href javascript:')
})

// 5. Tính hợp chuẩn HTML email: Không có display:flex, display:grid; mọi <img> có width và alt
test('Hợp chuẩn email: Không dùng flex/grid, mọi <img> hợp lệ đều có width và alt', () => {
  const templatePath = path.join(rootDir, 'src', 'templates', 'ilead-offer.json')
  const templateDoc = JSON.parse(fs.readFileSync(templatePath, 'utf8'))

  const { fragment, document } = renderEmail(templateDoc)

  for (const html of [fragment, document]) {
    assert.ok(!html.includes('display:flex'), 'Không được dùng flex')
    assert.ok(!html.includes('display: flex'), 'Không được dùng flex')
    assert.ok(!html.includes('display:grid'), 'Không được dùng grid')
    assert.ok(!html.includes('display: grid'), 'Không được dùng grid')
    assert.ok(!html.includes('data:image'), 'Không được dùng data: URI')
  }

  // Mọi <img> đều có width và alt
  const imgRegex = /<img\b([^>]*)>/gi
  let match
  let imgCount = 0
  while ((match = imgRegex.exec(document)) !== null) {
    imgCount++
    const attrs = match[1]
    assert.match(attrs, /\bwidth=["'][^"']+["']/, 'Thẻ <img> phải có thuộc tính width')
    assert.match(attrs, /\balt=["'][^"']*["']/, 'Thẻ <img> phải có thuộc tính alt')
    assert.ok(!attrs.includes('src=""'), 'src không được rỗng')
  }
  assert.ok(imgCount >= 3, `Phải có ít nhất 3 ảnh trong template iLEAD (tìm thấy ${imgCount})`)
})

// 6. Tính ổn định (Deterministic): Renderer không sinh id ngẫu nhiên
test('Tính ổn định: Hai lần render cùng 1 doc cho kết quả chính xác 100% từng byte', () => {
  const templatePath = path.join(rootDir, 'src', 'templates', 'ilead-offer.json')
  const templateDoc = JSON.parse(fs.readFileSync(templatePath, 'utf8'))

  const res1 = renderEmail(templateDoc)
  const res2 = renderEmail(templateDoc)

  assert.equal(res1.document, res2.document, 'Output HTML phải giống nhau từng ký tự')
  assert.equal(res1.plainText, res2.plainText, 'Output plainText phải giống nhau từng ký tự')
})

// 7. Parity Test: So sánh hiển thị tương đương giữa v1 và v2 ilead-offer.json
test('Parity Test: Template v2 ilead-offer.json tương đương về hiển thị với buildEmail cũ', () => {
  const templatePath = path.join(rootDir, 'src', 'templates', 'ilead-offer.json')
  const templateDoc = JSON.parse(fs.readFileSync(templatePath, 'utf8'))

  const v2 = renderEmail(templateDoc)
  const v1 = buildEmail(DEFAULT_CONTENT, DEFAULT_IMAGES)

  // 1. Kiểm tra các mốc nội dung chính xuất hiện ở cả 2 bản
  const keyTexts = [
    'Kính gửi toàn thể Anh/Chị CBNV Hà Nội',
    'Chương trình Tiếng Anh Online iLEAD',
    'THÔNG TIN CHƯƠNG TRÌNH',
    'ĐỊNH HƯỚNG ĐÀO TẠO',
    'ƯU ĐÃI ĐẶC BIỆT DÀNH CHO iSMART HÀ NỘI',
    'LỚP PRE-A1',
    'LỚP A1',
    '4.515.000 VNĐ',
    'ĐĂNG KÝ THAM GIA',
    '0967 417 895',
    'Đăng ký ngay hôm nay',
    'Trân trọng',
  ]

  for (const text of keyTexts) {
    assert.ok(v1.document.includes(text), `Bản v1 thiếu: "${text}"`)
    assert.ok(v2.document.includes(text), `Bản v2 thiếu: "${text}"`)
  }

  // 2. Kiểm tra thứ tự xuất hiện của các phần chính trong v2 khớp với v1
  const posBanner = v2.document.indexOf(DEFAULT_IMAGES.banner)
  const posInfo = v2.document.indexOf('THÔNG TIN CHƯƠNG TRÌNH')
  const posBenefits = v2.document.indexOf('ĐỊNH HƯỚNG ĐÀO TẠO')
  const posOffer = v2.document.indexOf('ƯU ĐÃI ĐẶC BIỆT')
  const posRegistration = v2.document.indexOf('ĐĂNG KÝ THAM GIA')
  const posFooter = v2.document.indexOf('Trân trọng')

  assert.ok(posBanner < posInfo, 'Banner phải trước Info')
  assert.ok(posInfo < posBenefits, 'Info phải trước Benefits')
  assert.ok(posBenefits < posOffer, 'Benefits phải trước Offer')
  assert.ok(posOffer < posRegistration, 'Offer phải trước Registration')
  assert.ok(posRegistration < posFooter, 'Registration phải trước Footer')

  // 3. Màu thương hiệu
  assert.ok(v2.document.includes(BRAND_COLORS.navy))
  assert.ok(v2.document.includes(BRAND_COLORS.orange))
  assert.ok(v2.document.includes(BRAND_COLORS.blue))
})

// 8. textImporter ở Phase 1: parse đúng cú pháp cũ ra các blocks tương thích
test('textImporter: Phân tích cú pháp cũ ra danh sách blocks đúng chuẩn', () => {
  const blocks = importTextToBlocks(DEFAULT_CONTENT, DEFAULT_IMAGES)

  assert.ok(blocks.length >= 6, 'Phải sinh ra tối thiểu 6 blocks chính')

  const types = blocks.map(b => b.type)
  assert.ok(types.includes('image'), 'Có block image banner')
  assert.ok(types.includes('text'), 'Có block text preamble')
  assert.ok(types.includes('infoCard'), 'Có block infoCard')
  assert.ok(types.includes('imageText'), 'Có block imageText')
  assert.ok(types.includes('offerCards'), 'Có block offerCards')
  assert.ok(types.includes('footer'), 'Có block footer')

  // Migrate v1 data thành EmailDoc
  const migratedDoc = migrateV1toV2({ content: DEFAULT_CONTENT, images: DEFAULT_IMAGES })
  assert.equal(migratedDoc.version, 2)
  assert.equal(migratedDoc.blocks.length, blocks.length)

  // Render doc đã migrate
  const rendered = renderEmail(migratedDoc)
  assert.ok(rendered.document.includes('THÔNG TIN CHƯƠNG TRÌNH'))
  assert.ok(rendered.document.includes('ĐĂNG KÝ THAM GIA'))
})

// 9. plainText: Chứa đầy đủ nội dung chính
test('plainText: Sinh từ blocks có đầy đủ nội dung chính', () => {
  const templatePath = path.join(rootDir, 'src', 'templates', 'ilead-offer.json')
  const templateDoc = JSON.parse(fs.readFileSync(templatePath, 'utf8'))
  const { plainText } = renderEmail(templateDoc)

  assert.ok(plainText.length > 200, 'plainText phải có nội dung')
  assert.ok(plainText.includes('Kính gửi toàn thể Anh/Chị CBNV Hà Nội'))
  assert.ok(plainText.includes('THÔNG TIN CHƯƠNG TRÌNH'))
  assert.ok(plainText.includes('ĐỊNH HƯỚNG ĐÀO TẠO'))
  assert.ok(plainText.includes('4.515.000 VNĐ'))
  assert.ok(plainText.includes('0967 417 895'))
  assert.ok(plainText.includes('Trân trọng'))
})
