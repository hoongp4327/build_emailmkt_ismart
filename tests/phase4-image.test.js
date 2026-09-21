import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateImagePlan,
  hasTransparency,
  decideOutputFormat,
} from '../src/editor/image/compressImage.js'
import {
  getRecentImages,
  addRecentImage,
  clearRecentImages,
} from '../src/editor/image/recentImages.js'
import { renderImageBlock } from '../src/render/blocks/image.js'
import { renderPaymentBlock } from '../src/render/blocks/payment.js'
import { renderImageTextBlock } from '../src/render/blocks/imageText.js'

// ==========================================
// 1. KIỂM THỬ calculateImagePlan (Logic thuần túy)
// ==========================================

test('calculateImagePlan: Từ chối file HEIC/HEIF với thông báo tiếng Việt', () => {
  assert.throws(
    () =>
      calculateImagePlan({
        width: 1000,
        height: 1000,
        fileType: 'image/heic',
        fileName: 'photo.heic',
      }),
    /Ảnh iPhone định dạng HEIC chưa hỗ trợ/
  )

  assert.throws(
    () =>
      calculateImagePlan({
        width: 1000,
        height: 1000,
        fileType: 'image/heif',
        fileName: 'photo.heif',
      }),
    /Ảnh iPhone định dạng HEIC chưa hỗ trợ/
  )

  assert.throws(
    () =>
      calculateImagePlan({
        width: 1000,
        height: 1000,
        fileType: '',
        fileName: 'IMG_1234.HEIC',
      }),
    /Ảnh iPhone định dạng HEIC chưa hỗ trợ/
  )
})

test('calculateImagePlan: Từ chối định dạng không hỗ trợ (GIF, BMP, SVG)', () => {
  assert.throws(
    () =>
      calculateImagePlan({
        width: 500,
        height: 500,
        fileType: 'image/gif',
      }),
    /Định dạng ảnh không được hỗ trợ/
  )

  assert.throws(
    () =>
      calculateImagePlan({
        width: 500,
        height: 500,
        fileType: 'image/bmp',
      }),
    /Định dạng ảnh không được hỗ trợ/
  )
})

test('calculateImagePlan: kind=qr giữ nguyên bytes gốc với JPG/PNG <= 4 MiB, không vẽ canvas', () => {
  const planPng = calculateImagePlan({
    width: 800,
    height: 800,
    fileType: 'image/png',
    fileSize: 2 * 1024 * 1024,
    kind: 'qr',
  })

  assert.equal(planPng.action, 'keep_original')
  assert.equal(planPng.outputType, 'image/png')
  assert.equal(planPng.targetWidth, 800)
  assert.equal(planPng.targetHeight, 800)
  assert.equal(planPng.warning, '')

  const planJpg = calculateImagePlan({
    width: 700,
    height: 700,
    fileType: 'image/jpeg',
    fileSize: 1 * 1024 * 1024,
    kind: 'qr',
  })

  assert.equal(planJpg.action, 'keep_original')
  assert.equal(planJpg.outputType, 'image/jpeg')
  assert.equal(planJpg.targetWidth, 700)
  assert.equal(planJpg.targetHeight, 700)
  assert.equal(planJpg.warning, '')
})

test('calculateImagePlan: kind=qr cảnh báo khi cạnh ngắn < 600px nhưng vẫn cho upload', () => {
  const planSmall = calculateImagePlan({
    width: 450,
    height: 450,
    fileType: 'image/png',
    fileSize: 300 * 1024,
    kind: 'qr',
  })

  assert.equal(planSmall.action, 'keep_original')
  assert.equal(planSmall.warning, 'Ảnh QR độ phân giải thấp, có thể khó quét')

  const planRect = calculateImagePlan({
    width: 800,
    height: 550,
    fileType: 'image/jpeg',
    fileSize: 500 * 1024,
    kind: 'qr',
  })

  assert.equal(planRect.warning, 'Ảnh QR độ phân giải thấp, có thể khó quét')
})

test('calculateImagePlan: kind=qr chuyển WebP sang PNG, giữ kích thước, disableSmoothing=true', () => {
  const planWebp = calculateImagePlan({
    width: 720,
    height: 720,
    fileType: 'image/webp',
    fileSize: 150 * 1024,
    kind: 'qr',
  })

  assert.equal(planWebp.action, 'convert_webp_to_png')
  assert.equal(planWebp.outputType, 'image/png')
  assert.equal(planWebp.targetWidth, 720)
  assert.equal(planWebp.targetHeight, 720)
  assert.equal(planWebp.disableSmoothing, true)
})

test('calculateImagePlan: kind=qr từ chối file vượt quá 4 MiB', () => {
  assert.throws(
    () =>
      calculateImagePlan({
        width: 1000,
        height: 1000,
        fileType: 'image/png',
        fileSize: 5 * 1024 * 1024,
        kind: 'qr',
      }),
    /Ảnh QR vượt quá 4 MB/
  )
})

test('calculateImagePlan: Ảnh thường <= 1280px và không phải WebP thì giữ nguyên bytes gốc', () => {
  const plan = calculateImagePlan({
    width: 1200,
    height: 800,
    fileType: 'image/jpeg',
    fileSize: 1.2 * 1024 * 1024,
    kind: 'image',
  })

  assert.equal(plan.action, 'keep_original')
  assert.equal(plan.outputType, 'image/jpeg')
  assert.equal(plan.targetWidth, 1200)
  assert.equal(plan.targetHeight, 800)
})

test('calculateImagePlan: Ảnh thường > 1280px tính tỷ lệ resize chuẩn', () => {
  // 1. Ảnh ngang 2560x1440
  const landscape = calculateImagePlan({
    width: 2560,
    height: 1440,
    fileType: 'image/jpeg',
    kind: 'image',
  })
  assert.equal(landscape.action, 'process_canvas')
  assert.equal(landscape.targetWidth, 1280)
  assert.equal(landscape.targetHeight, 720)

  // 2. Ảnh dọc 1080x1920
  const portrait = calculateImagePlan({
    width: 1080,
    height: 1920,
    fileType: 'image/png',
    kind: 'image',
  })
  assert.equal(portrait.action, 'process_canvas')
  assert.equal(portrait.targetWidth, 720)
  assert.equal(portrait.targetHeight, 1280)

  // 3. Ảnh vuông 2000x2000
  const square = calculateImagePlan({
    width: 2000,
    height: 2000,
    fileType: 'image/jpeg',
    kind: 'image',
  })
  assert.equal(square.targetWidth, 1280)
  assert.equal(square.targetHeight, 1280)
})

test('calculateImagePlan: Ảnh WebP thường luôn qua canvas để chuyển đổi cho Outlook', () => {
  const webpPlan = calculateImagePlan({
    width: 600,
    height: 400,
    fileType: 'image/webp',
    kind: 'image',
  })
  assert.equal(webpPlan.action, 'process_canvas')
})

// ==========================================
// 2. KIỂM THỬ hasTransparency (Quét toàn bộ pixel)
// ==========================================

test('hasTransparency: Trả về false khi mọi pixel hoàn toàn đục (alpha = 255)', () => {
  const opaqueBuffer = new Uint8ClampedArray(400) // 100 pixels
  for (let i = 0; i < 400; i += 4) {
    opaqueBuffer[i] = 255     // R
    opaqueBuffer[i + 1] = 120 // G
    opaqueBuffer[i + 2] = 50  // B
    opaqueBuffer[i + 3] = 255 // A
  }
  assert.equal(hasTransparency(opaqueBuffer), false)
})

test('hasTransparency: Quét toàn bộ không bỏ sót pixel trong suốt ở cuối mảng', () => {
  const buffer = new Uint8ClampedArray(400) // 100 pixels
  for (let i = 0; i < 400; i += 4) {
    buffer[i + 3] = 255
  }
  // Đặt pixel cuối cùng có độ trong suốt (alpha = 254)
  buffer[399] = 254
  assert.equal(hasTransparency(buffer), true)

  // Đặt pixel cuối cùng hoàn toàn trong suốt (alpha = 0)
  buffer[399] = 0
  assert.equal(hasTransparency(buffer), true)
})

test('hasTransparency: Xử lý an toàn khi mảng rỗng hoặc không hợp lệ', () => {
  assert.equal(hasTransparency(null), false)
  assert.equal(hasTransparency([]), false)
  assert.equal(hasTransparency(new Uint8ClampedArray(0)), false)
})

// ==========================================
// 3. KIỂM THỬ decideOutputFormat
// ==========================================

test('decideOutputFormat: Ảnh trong suốt LUÔN giữ PNG bất kể định dạng gốc', () => {
  assert.equal(
    decideOutputFormat({ originalType: 'image/png', isTransparent: true, resizedPngSize: 2000000 }),
    'image/png'
  )
  assert.equal(
    decideOutputFormat({ originalType: 'image/webp', isTransparent: true }),
    'image/png'
  )
})

test('decideOutputFormat: PNG không trong suốt giữ PNG nếu sau resize <= 1.5 MB', () => {
  assert.equal(
    decideOutputFormat({
      originalType: 'image/png',
      isTransparent: false,
      resizedPngSize: 1.2 * 1024 * 1024,
    }),
    'image/png'
  )
})

test('decideOutputFormat: PNG không trong suốt chuyển JPEG nếu sau resize > 1.5 MB', () => {
  assert.equal(
    decideOutputFormat({
      originalType: 'image/png',
      isTransparent: false,
      resizedPngSize: 1.6 * 1024 * 1024,
    }),
    'image/jpeg'
  )
})

test('decideOutputFormat: JPEG hoặc WebP không trong suốt xuất JPEG', () => {
  assert.equal(
    decideOutputFormat({ originalType: 'image/jpeg', isTransparent: false }),
    'image/jpeg'
  )
  assert.equal(
    decideOutputFormat({ originalType: 'image/webp', isTransparent: false }),
    'image/jpeg'
  )
})

// ==========================================
// 4. KIỂM THỬ recentImages (Kho ảnh gần đây)
// ==========================================

test('recentImages: Thêm URL mới vào đầu danh sách, giới hạn 20 và khử trùng lặp', () => {
  const mockStorage = {}
  globalThis.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => {
      mockStorage[key] = String(val)
    },
    removeItem: (key) => {
      delete mockStorage[key]
    },
  }

  clearRecentImages()
  assert.deepEqual(getRecentImages(), [])

  // Thêm 25 ảnh
  for (let i = 1; i <= 25; i++) {
    addRecentImage(`https://res.cloudinary.com/demo/image_${i}.png`)
  }

  const list = getRecentImages()
  assert.equal(list.length, 20, 'Danh sách tối đa 20 ảnh')
  assert.equal(list[0], 'https://res.cloudinary.com/demo/image_25.png', 'Ảnh mới nhất phải ở vị trí đầu tiên')
  assert.equal(list[19], 'https://res.cloudinary.com/demo/image_6.png')

  // Thêm lại ảnh số 10 (trùng lặp) -> phải nhảy lên đầu tiên, tổng số vẫn là 20
  addRecentImage('https://res.cloudinary.com/demo/image_10.png')
  const reordered = getRecentImages()
  assert.equal(reordered.length, 20)
  assert.equal(reordered[0], 'https://res.cloudinary.com/demo/image_10.png')

  // Bỏ qua URL không an toàn hoặc không bắt đầu bằng https://
  addRecentImage('http://insecure.com/pic.png')
  addRecentImage('data:image/png;base64,123')
  assert.equal(getRecentImages().length, 20)

  clearRecentImages()
  assert.deepEqual(getRecentImages(), [])
})

// ==========================================
// 5. KIỂM THỬ Render Email HTML (Tương thích Outlook Desktop)
// ==========================================

test('Render khối image 320px: dùng width="320" và style có width:320px, KHÔNG dùng width:100%', () => {
  const block = {
    type: 'image',
    props: {
      src: 'https://res.cloudinary.com/demo/banner.jpg',
      alt: 'Banner khuyến mãi',
      width: 320,
      radius: 8,
      align: 'center',
    },
    style: {
      paddingTop: 15,
      paddingBottom: 15,
    },
  }

  const html = renderImageBlock(block)

  // 1. Phải có thuộc tính width="320"
  assert.match(html, /width="320"/, 'Thẻ <img> phải có thuộc tính width="320"')

  // 2. Style phải chứa width:320px;max-width:100%
  assert.match(html, /width:320px;max-width:100%/, 'Style phải cố định width:320px kèm max-width:100%')

  // 3. KHÔNG được dùng width:100% (gây co dãn toàn phần trên Outlook)
  assert.ok(!html.includes('width:100%;max-width:320px'), 'Không được dùng width:100% kèm max-width:320px')

  // 4. Có border-radius:8px
  assert.match(html, /border-radius:8px;/, 'Phải có border-radius')

  // 5. Alt text được render
  assert.match(html, /alt="Banner khuyến mãi"/)
})

test('Render khối image full width: dùng width="640" và style width:100%;max-width:640px', () => {
  const block = {
    type: 'image',
    props: {
      src: 'https://res.cloudinary.com/demo/full-banner.jpg',
      alt: 'Banner chính',
      width: 'full',
      radius: 0,
      align: 'center',
    },
  }

  const html = renderImageBlock(block)
  assert.match(html, /width="640"/, 'Ảnh full width dùng width="640"')
  assert.match(html, /width:100%;max-width:640px/, 'Ảnh full width dùng width:100%;max-width:640px')
  assert.match(html, /border-radius:0px;/)
})

test('Render khối image căn trái, căn phải và có link + caption', () => {
  const leftBlock = {
    type: 'image',
    props: {
      src: 'https://res.cloudinary.com/demo/left.jpg',
      width: 280,
      align: 'left',
      link: 'https://ismart.edu.vn',
      caption: 'Chú thích hình ảnh',
    },
  }

  const leftHtml = renderImageBlock(leftBlock)
  assert.match(leftHtml, /margin:0;/, 'Căn trái có margin:0;')
  assert.match(leftHtml, /<a href="https:\/\/ismart\.edu\.vn\/?/, 'Bọc thẻ <a> hợp lệ')
  assert.match(leftHtml, /Chú thích hình ảnh/, 'Có caption text')

  const rightBlock = {
    type: 'image',
    props: {
      src: 'https://res.cloudinary.com/demo/right.jpg',
      width: 280,
      align: 'right',
    },
  }
  const rightHtml = renderImageBlock(rightBlock)
  assert.match(rightHtml, /margin:0 0 0 auto;/, 'Căn phải có margin:0 0 0 auto;')
})

test('Render khối payment có QR: tuân thủ width="180" và style cố định pixel', () => {
  const paymentBlock = {
    type: 'payment',
    props: {
      bankName: 'MB Bank',
      accountNumber: '123456789',
      accountHolder: 'NGUYEN VAN A',
      qrImageUrl: 'https://res.cloudinary.com/demo/qr.png',
      qrSize: 180,
    },
  }

  const html = renderPaymentBlock(paymentBlock)
  assert.match(html, /width="180"/, 'QR có width="180"')
  assert.match(html, /width:180px;max-width:100%/, 'QR có style width:180px;max-width:100%')
  assert.ok(!html.includes('width:100%;max-width:180px'))
})

test('Render khối imageText: ảnh cột bên dùng đúng kích thước pixel', () => {
  const block = {
    type: 'imageText',
    props: {
      src: 'https://res.cloudinary.com/demo/thumb.png',
      imageWidth: 160,
      imagePosition: 'left',
      contentBlocks: [],
    },
  }

  const html = renderImageTextBlock(block)
  assert.match(html, /width="160"/, 'Ảnh cột bên có width="160"')
  assert.match(html, /width:160px;max-width:100%/, 'Ảnh cột bên có style width:160px')
})

test('Không render thẻ <img> khi URL rỗng hoặc không hợp lệ', () => {
  const emptyBlock = {
    type: 'image',
    props: {
      src: '',
    },
  }
  assert.equal(renderImageBlock(emptyBlock), '')

  const dataUriBlock = {
    type: 'image',
    props: {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  }
  assert.equal(renderImageBlock(dataUriBlock), '')
})
