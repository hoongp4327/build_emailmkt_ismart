export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_KINDS = ['image', 'qr', 'banner', 'mascot']
export const IMAGE_SLOTS = IMAGE_KINDS
export const UPLOAD_PATH = '/api/upload-image'

export function validateImageFile(file) {
  if (!file || !IMAGE_TYPES.includes(file.type)) return 'Vui lòng chọn ảnh JPG, PNG hoặc WebP.'
  if (!file.size) return 'File ảnh đang trống. Vui lòng chọn ảnh khác.'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh vượt quá 4 MB. Vui lòng giảm dung lượng trước khi tải.'
  return ''
}
