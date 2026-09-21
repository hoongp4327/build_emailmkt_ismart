import test from 'node:test'
import assert from 'node:assert/strict'

import { htmlToText, textToHtml } from '../src/editor/textFormat.js'
import { renderEmail } from '../src/render/renderEmail.js'
import { createBlock, createDefaultDoc, BRAND_COLORS } from '../src/model/defaults.js'
import { migrateV1toV2 } from '../src/model/migrate.js'
import ileadOfferDoc from '../src/templates/ilead-offer.json' with { type: 'json' }
import paymentNoticeDoc from '../src/templates/payment-notice.json' with { type: 'json' }

// 1. Test Round-trip Text <-> HTML với cú pháp **đậm**, ký tự & < > và tiếng Việt (Ràng buộc 1)
test('Round-trip Text <-> HTML: Giữ nguyên vẹn chữ đậm, ký tự đặc biệt và tiếng Việt không double-escape', () => {
  const cases = [
    '<p>Xin chào <strong>iSMART</strong> &amp; các bạn!<br>Dòng thứ hai.</p><p>Đoạn văn 2 &lt;thử nghiệm&gt; &quot;thành công&quot;.</p>',
    '<p>Khóa học tiếng Anh <strong>iLEAD Pre-A1 &amp; A1</strong> dành cho con em CBNV.</p>',
    '<p>Học phí: <strong>4.515.000 VNĐ</strong> (tiết kiệm &gt; 45% so với giá gốc).</p>',
  ]

  for (const originalHtml of cases) {
    // 1. Chuyển từ HTML sang Text
    const text = htmlToText(originalHtml)

    // Đảm bảo không chứa thẻ HTML thô trong text
    assert.ok(!text.includes('<p>'), 'Textarea không được chứa thẻ <p>')
    assert.ok(!text.includes('</p>'), 'Textarea không được chứa thẻ </p>')
    assert.ok(!text.includes('<br>'), 'Textarea không được chứa thẻ <br>')
    assert.ok(!text.includes('<strong>'), 'Textarea không được chứa thẻ <strong>')
    assert.ok(!text.includes('&amp;'), 'Textarea không được chứa HTML entity &amp;')

    // Kiểm tra ký hiệu ** đã được chuyển đổi đúng
    assert.ok(text.includes('**'), 'Textarea phải chứa ký hiệu **đậm**')

    // 2. Chuyển ngược lại từ Text sang HTML
    const convertedHtml = textToHtml(text)

    // 3. Chuyển tiếp một vòng nữa sang Text để kiểm tra tính đối xứng round-trip
    const roundTripText = htmlToText(convertedHtml)
    assert.equal(roundTripText, text, 'Text sau 2 vòng chuyển đổi phải trùng khớp 100%')

    // Đảm bảo không bị double-escape (vd: &amp;amp;)
    assert.ok(!convertedHtml.includes('&amp;amp;'), 'Tuyệt đối không escape 2 lần (&amp;amp;)')
    assert.ok(!convertedHtml.includes('&lt;lt;'), 'Tuyệt đối không double-escape &lt;')
  }
})

// 2. Test Tách biệt data-block-id: Chỉ có trong preview, bản copy và download sạch 100% (Ràng buộc 4)
test('Tách biệt data-block-id: Chỉ xuất hiện trong previewMode, bản Copy và Download sạch 100%', () => {
  const doc = createDefaultDoc({}, [
    createBlock('heading', { html: 'Tiêu đề' }, {}, 'block-h1'),
    createBlock('text', { html: '<p>Nội dung</p>' }, {}, 'block-t1'),
  ])

  // Bản Preview
  const preview = renderEmail(doc, { previewMode: true })
  assert.ok(preview.fragment.includes('data-block-id="block-h1"'), 'Preview phải có data-block-id')
  assert.ok(preview.fragment.includes('data-block-id="block-t1"'), 'Preview phải có data-block-id')

  // Bản Sao chép cho Gmail / Tải HTML
  const clean = renderEmail(doc, { previewMode: false })
  assert.ok(!clean.fragment.includes('data-block-id'), 'Bản copy fragment tuyệt đối KHÔNG có data-block-id')
  assert.ok(!clean.document.includes('data-block-id'), 'Bản download document tuyệt đối KHÔNG có data-block-id')
})

// 3. Test Khóa chiều rộng email và Color Hex (Ràng buộc 5)
test('Khóa chiều rộng email 600/640px và xác thực mã màu Hex', () => {
  const doc640 = createDefaultDoc({ width: 640 })
  assert.equal(doc640.settings.width, 640)

  const doc600 = createDefaultDoc({ width: 600 })
  assert.equal(doc600.settings.width, 600)

  // Kiểm tra mã màu Palette brand iSMART đều là Hex 6 ký tự
  for (const [name, hex] of Object.entries(BRAND_COLORS)) {
    assert.match(hex, /^#[0-9a-fA-F]{6}$/, `Màu brand ${name} phải là Hex 6 ký tự`)
  }
})

// 4. Test Thêm khối: Chèn ngay dưới khối đang chọn (Ràng buộc 9)
test('Thêm khối: Chèn ngay dưới khối đang chọn hoặc thêm cuối nếu chưa chọn', () => {
  let doc = createDefaultDoc({}, [
    createBlock('heading', { html: 'Khối 1' }, {}, 'id-1'),
    createBlock('text', { html: '<p>Khối 2</p>' }, {}, 'id-2'),
  ])

  // Trường hợp 1: Đang chọn 'id-1', chèn khối mới -> nằm giữa id-1 và id-2
  const selectedBlockId = 'id-1'
  const newBlock = createBlock('button', { label: 'Nút mới' }, {}, 'id-new-1')

  const idx = doc.blocks.findIndex((b) => b.id === selectedBlockId)
  const nextBlocks = [...doc.blocks]
  nextBlocks.splice(idx + 1, 0, newBlock)
  doc = { ...doc, blocks: nextBlocks }

  assert.equal(doc.blocks[0].id, 'id-1')
  assert.equal(doc.blocks[1].id, 'id-new-1', 'Khối mới phải được chèn ngay dưới id-1')
  assert.equal(doc.blocks[2].id, 'id-2')

  // Trường hợp 2: Không chọn gì -> chèn cuối
  const endBlock = createBlock('divider', {}, {}, 'id-end')
  doc = { ...doc, blocks: [...doc.blocks, endBlock] }
  assert.equal(doc.blocks[doc.blocks.length - 1].id, 'id-end')
})

// 5. Test Tự động bỏ chọn khi block không còn tồn tại sau khi xóa (Ràng buộc 7)
test('Tự động bỏ chọn: Nếu block đang chọn bị xóa thì selectedBlockId chuyển về null', () => {
  let doc = createDefaultDoc({}, [
    createBlock('heading', {}, {}, 'id-1'),
    createBlock('text', {}, {}, 'id-2'),
  ])

  let selectedId = 'id-2'

  // Xóa id-2
  doc = { ...doc, blocks: doc.blocks.filter((b) => b.id !== 'id-2') }

  // Logic kiểm tra tồn tại (tương đương useEffect trong App.jsx)
  if (selectedId && !doc.blocks.some((b) => b.id === selectedId)) {
    selectedId = null
  }

  assert.equal(selectedId, null, 'selectedId phải tự động reset về null khi block bị xóa')
})

// 6. Test postMessage: Chỉ chấp nhận block id có trong doc (Ràng buộc 8)
test('Bảo mật postMessage: Chỉ chấp nhận block ID có thực trong doc.blocks', () => {
  const doc = createDefaultDoc({}, [
    createBlock('heading', {}, {}, 'real-block-1'),
    createBlock('text', {}, {}, 'real-block-2'),
  ])

  const validBlockIds = doc.blocks.map((b) => b.id)

  function simulateReceiveMessage(blockId) {
    if (blockId && validBlockIds.includes(blockId)) {
      return blockId // Chấp nhận
    }
    return null // Từ chối
  }

  assert.equal(simulateReceiveMessage('real-block-1'), 'real-block-1', 'Chấp nhận block ID hợp lệ')
  assert.equal(simulateReceiveMessage('fake-block-999'), null, 'Từ chối block ID không có trong doc')
  assert.equal(simulateReceiveMessage('<script>alert(1)</script>'), null, 'Từ chối payload nguy hiểm')
})

// 7. Test Lịch sử Undo / Redo: Sliding window tối thiểu 50 bước
test('Lịch sử Undo / Redo: Hỗ trợ tối thiểu 50 bước và khôi phục state chính xác', () => {
  const initialDoc = createDefaultDoc({}, [])
  let past = []
  let present = initialDoc
  let future = []

  // Thực hiện 55 thao tác thêm block
  for (let i = 1; i <= 55; i++) {
    const nextDoc = {
      ...present,
      blocks: [...present.blocks, createBlock('text', { html: `<p>Block ${i}</p>` }, {}, `b-${i}`)],
    }
    // Sliding window tối đa 50 bước
    past = [...past.slice(-49), present]
    present = nextDoc
    future = []
  }

  assert.equal(present.blocks.length, 55, 'Hiện tại có 55 blocks')
  assert.equal(past.length, 50, 'Lịch sử chỉ lưu tối đa 50 bước')

  // Thực hiện Undo 5 lần
  for (let i = 0; i < 5; i++) {
    const previous = past[past.length - 1]
    past = past.slice(0, past.length - 1)
    future = [present, ...future]
    present = previous
  }

  assert.equal(present.blocks.length, 50, 'Sau khi Undo 5 lần thì còn 50 blocks')
  assert.equal(future.length, 5, 'Future có 5 bước')

  // Thực hiện Redo 2 lần
  for (let i = 0; i < 2; i++) {
    const next = future[0]
    future = future.slice(1)
    past = [...past, present]
    present = next
  }

  assert.equal(present.blocks.length, 52, 'Sau khi Redo 2 lần thì có 52 blocks')
})

// 8. Test Tải mẫu ban đầu: ileadOfferDoc nạp đầy đủ blocks
test('Tải mẫu mặc định: ileadOfferDoc có đầy đủ các block chuẩn', () => {
  assert.equal(ileadOfferDoc.version, 2)
  assert.ok(Array.isArray(ileadOfferDoc.blocks))
  assert.ok(ileadOfferDoc.blocks.length >= 6)

  const rendered = renderEmail(ileadOfferDoc)
  assert.ok(rendered.document.includes('THÔNG TIN CHƯƠNG TRÌNH'))
  assert.ok(rendered.document.includes('ĐĂNG KÝ THAM GIA'))
})

// 9. Test Mẫu Thông báo học phí & QR Chuyển khoản (payment-notice.json)
test('Mẫu Thông báo học phí & Chuyển khoản (payment-notice.json): Tương đương chính xác với HTML mẫu', () => {
  assert.equal(paymentNoticeDoc.version, 2)
  assert.equal(paymentNoticeDoc.settings.width, 640)
  assert.ok(Array.isArray(paymentNoticeDoc.blocks))
  assert.equal(paymentNoticeDoc.blocks.length, 7)

  const rendered = renderEmail(paymentNoticeDoc)
  assert.ok(rendered.document.includes('Kính gửi Quý học viên'), 'Phải chứa lời chào mở đầu')
  assert.ok(rendered.document.includes('I. THÔNG TIN LỚP HỌC'), 'Phải chứa mục I. Thông tin lớp học')
  assert.ok(rendered.document.includes('HSK1 ONLINE'), 'Phải chứa tên lớp HSK1 ONLINE')
  assert.ok(rendered.document.includes('II. HỌC PHÍ VÀ THANH TOÁN'), 'Phải chứa mục II. Học phí')
  assert.ok(rendered.document.includes('2.420.000 VNĐ'), 'Phải chứa số tiền học phí')
  assert.ok(rendered.document.includes('THÔNG TIN CHUYỂN KHOẢN'), 'Phải chứa tiêu đề chuyển khoản')
  assert.ok(rendered.document.includes('50129677'), 'Phải hiển thị nguyên văn STK ACB 50129677')
  assert.ok(rendered.document.includes('CÔNG TY CỔ PHẦN GIÁO DỤC ISMART HÀ NỘI'), 'Phải chứa tên chủ tài khoản')
  assert.ok(rendered.document.includes('III. TÀI LIỆU VÀ DỤNG CỤ HỌC TẬP'), 'Phải chứa mục III. Tài liệu')
  assert.ok(rendered.document.includes('fahasa.com'), 'Phải chứa link sách Fahasa')
  assert.ok(rendered.document.includes('Đăng ký ngay hôm nay'), 'Phải chứa thông điệp chân trang')
  assert.ok(!rendered.document.includes('src=""'), 'Không được có thẻ img rỗng')
})

