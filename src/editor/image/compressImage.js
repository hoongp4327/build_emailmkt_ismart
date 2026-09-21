import { MAX_IMAGE_BYTES } from '../../uploadPolicy.js'

/**
 * Tính toán kế hoạch xử lý ảnh thuần túy (không phụ thuộc Canvas DOM)
 * để có thể kiểm thử tự động 100% trong môi trường Node.js.
 *
 * @param {Object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {string} params.fileType
 * @param {number} [params.fileSize=0]
 * @param {string} [params.fileName='']
 * @param {'image'|'qr'|'banner'|'mascot'} [params.kind='image']
 * @param {number} [params.maxDimension=1280]
 * @returns {Object}
 */
export function calculateImagePlan({
  width,
  height,
  fileType = '',
  fileSize = 0,
  fileName = '',
  kind = 'image',
  maxDimension = 1280,
}) {
  const normalizedType = String(fileType || '').toLowerCase()
  const lowerName = String(fileName || '').toLowerCase()

  // 1. Kiểm tra định dạng cấm: HEIC / HEIF
  if (
    normalizedType === 'image/heic' ||
    normalizedType === 'image/heif' ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  ) {
    throw new Error('Ảnh iPhone định dạng HEIC chưa hỗ trợ, vui lòng chụp màn hình hoặc xuất sang JPG')
  }

  // 2. Kiểm tra loại file hỗ trợ
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(normalizedType)) {
    throw new Error('Định dạng ảnh không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.')
  }

  // 3. Quy tắc đặc thù cho kind === 'qr'
  if (kind === 'qr') {
    const shortEdge = Math.min(width, height)
    const warning = shortEdge < 600 ? 'Ảnh QR độ phân giải thấp, có thể khó quét' : ''

    // WebP bắt buộc chuyển sang PNG, giữ nguyên kích thước, tắt imageSmoothing
    if (normalizedType === 'image/webp') {
      return {
        action: 'convert_webp_to_png',
        targetWidth: width,
        targetHeight: height,
        outputType: 'image/png',
        warning,
        disableSmoothing: true,
      }
    }

    // JPG hoặc PNG: Không vẽ lại qua canvas, không resize, giữ nguyên bytes gốc
    if (fileSize > MAX_IMAGE_BYTES) {
      throw new Error('Ảnh QR vượt quá 4 MB. Vui lòng giảm dung lượng trước khi tải.')
    }

    return {
      action: 'keep_original',
      outputType: normalizedType,
      targetWidth: width,
      targetHeight: height,
      warning,
    }
  }

  // 4. Quy tắc cho ảnh thông thường (kind !== 'qr')
  const needsResize = width > maxDimension || height > maxDimension
  let targetWidth = width
  let targetHeight = height

  if (needsResize) {
    if (width >= height) {
      targetHeight = Math.round((height * maxDimension) / width)
      targetWidth = maxDimension
    } else {
      targetWidth = Math.round((width * maxDimension) / height)
      targetHeight = maxDimension
    }
  }

  // Ảnh không cần resize và không phải WebP -> upload nguyên bytes gốc, không nén lại
  if (!needsResize && normalizedType !== 'image/webp' && fileSize <= MAX_IMAGE_BYTES) {
    return {
      action: 'keep_original',
      outputType: normalizedType,
      targetWidth: width,
      targetHeight: height,
      warning: '',
    }
  }

  // Cần xử lý qua canvas (resize hoặc chuyển đổi WebP sang JPG/PNG)
  return {
    action: 'process_canvas',
    originalType: normalizedType,
    targetWidth,
    targetHeight,
    warning: '',
  }
}

/**
 * Quét TOÀN BỘ pixel của ảnh để phát hiện vùng trong suốt (alpha channel < 255).
 * Tuyệt đối không lấy mẫu để tránh bỏ sót các chi tiết trong suốt viền hoặc góc.
 *
 * @param {Uint8ClampedArray} data - Dữ liệu ImageData.data RGBA
 * @returns {boolean}
 */
export function hasTransparency(data) {
  if (!data || !data.length) return false
  const len = data.length
  // Kênh alpha nằm ở vị trí index 3, 7, 11, ...
  for (let i = 3; i < len; i += 4) {
    if (data[i] < 255) {
      return true
    }
  }
  return false
}

/**
 * Quyết định định dạng đầu ra cho canvas dựa trên loại ảnh gốc, độ trong suốt và kích thước file PNG sau resize.
 *
 * @param {Object} params
 * @param {string} params.originalType
 * @param {boolean} params.isTransparent
 * @param {number} [params.resizedPngSize=0]
 * @returns {'image/png'|'image/jpeg'}
 */
export function decideOutputFormat({ originalType, isTransparent, resizedPngSize = 0 }) {
  // Ảnh có vùng trong suốt -> luôn giữ PNG để không bị nền đen
  if (isTransparent) {
    return 'image/png'
  }

  // Đầu vào PNG không trong suốt: chỉ chuyển sang JPEG 0.85 nếu file sau resize vẫn > 1.5 MB
  if (originalType === 'image/png') {
    if (resizedPngSize > 1.5 * 1024 * 1024) {
      return 'image/jpeg'
    }
    return 'image/png'
  }

  // Đầu vào JPEG hoặc WebP không trong suốt -> xuất JPEG
  return 'image/jpeg'
}

/**
 * Chuyển đổi canvas thành Blob an toàn qua Promise.
 * @param {HTMLCanvasElement} canvas
 * @param {string} type
 * @param {number} [quality]
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Lỗi xuất canvas thành file ảnh.'))
      },
      type,
      quality
    )
  })
}

/**
 * Nén và chuẩn hóa ảnh phía client trên trình duyệt.
 *
 * @param {File} file
 * @param {Object} [options]
 * @param {'image'|'qr'|'banner'|'mascot'} [options.kind='image']
 * @param {number} [options.maxDimension=1280]
 * @param {number} [options.jpegQuality=0.85]
 * @returns {Promise<{ file: File, warning: string, width: number, height: number }>}
 */
export async function compressImage(file, options = {}) {
  const { kind = 'image', maxDimension = 1280, jpegQuality = 0.85 } = options

  // Đọc metadata và xoay đúng hướng EXIF
  let bitmap = null
  let width = 0
  let height = 0

  if (typeof createImageBitmap === 'function') {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      width = bitmap.width
      height = bitmap.height
    } catch {
      bitmap = null
    }
  }

  let tempImg = null
  let tempUrl = null

  if (!bitmap) {
    tempImg = new Image()
    tempUrl = URL.createObjectURL(file)
    tempImg.src = tempUrl
    await new Promise((resolve, reject) => {
      tempImg.onload = resolve
      tempImg.onerror = () => reject(new Error('Không thể đọc file ảnh. File có thể bị hỏng.'))
    })
    width = tempImg.naturalWidth || tempImg.width
    height = tempImg.naturalHeight || tempImg.height
  }

  const source = bitmap || tempImg

  try {
    const plan = calculateImagePlan({
      width,
      height,
      fileType: file.type,
      fileSize: file.size,
      fileName: file.name,
      kind,
      maxDimension,
    })

    // Nếu không cần can thiệp canvas -> trả về file gốc
    if (plan.action === 'keep_original') {
      return { file, warning: plan.warning, width, height }
    }

    // Xử lý canvas
    const canvas = document.createElement('canvas')
    canvas.width = plan.targetWidth
    canvas.height = plan.targetHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (plan.disableSmoothing) {
      ctx.imageSmoothingEnabled = false
    } else {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    }

    // Trường hợp 1: QR từ WebP -> chuyển sang PNG giữ nguyên kích thước
    if (plan.action === 'convert_webp_to_png') {
      ctx.drawImage(source, 0, 0, plan.targetWidth, plan.targetHeight)
      const pngBlob = await canvasToBlob(canvas, 'image/png')
      const convertedFile = new File([pngBlob], file.name.replace(/\.[^.]+$/, '') + '.png', {
        type: 'image/png',
      })
      return {
        file: convertedFile,
        warning: plan.warning,
        width: plan.targetWidth,
        height: plan.targetHeight,
      }
    }

    // Trường hợp 2: Ảnh thường
    // Vẽ ảnh lên canvas tạm để quét toàn bộ pixel kiểm tra trong suốt
    ctx.drawImage(source, 0, 0, plan.targetWidth, plan.targetHeight)
    const imgData = ctx.getImageData(0, 0, plan.targetWidth, plan.targetHeight)
    const isTransparent = hasTransparency(imgData.data)

    // Nếu là PNG, thử xuất PNG trước để đo dung lượng
    let initialPngSize = 0
    let pngBlob = null
    if (plan.originalType === 'image/png') {
      pngBlob = await canvasToBlob(canvas, 'image/png')
      initialPngSize = pngBlob.size
    }

    const outputType = decideOutputFormat({
      originalType: plan.originalType,
      isTransparent,
      resizedPngSize: initialPngSize,
    })

    let finalBlob = null

    if (outputType === 'image/png') {
      finalBlob = pngBlob || (await canvasToBlob(canvas, 'image/png'))
    } else {
      // Trước khi xuất JPEG: LUÔN fill nền trắng #ffffff cho canvas để chống nền đen
      ctx.clearRect(0, 0, plan.targetWidth, plan.targetHeight)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, plan.targetWidth, plan.targetHeight)
      ctx.drawImage(source, 0, 0, plan.targetWidth, plan.targetHeight)
      finalBlob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality)
    }

    const newExt = outputType === 'image/jpeg' ? '.jpg' : '.png'
    const newName = file.name.replace(/\.[^.]+$/, '') + newExt
    const resultFile = new File([finalBlob], newName, { type: outputType })

    return {
      file: resultFile,
      warning: plan.warning,
      width: plan.targetWidth,
      height: plan.targetHeight,
    }
  } finally {
    if (bitmap && typeof bitmap.close === 'function') {
      bitmap.close()
    }
    if (tempUrl) {
      URL.revokeObjectURL(tempUrl)
    }
  }
}
