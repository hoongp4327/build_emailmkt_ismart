const RECENT_IMAGES_KEY = 'ismart_recent_images'
const MAX_RECENT_IMAGES = 20

/**
 * Lấy danh sách tối đa 20 URL ảnh gần đây từ localStorage.
 * @returns {string[]}
 */
export function getRecentImages() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(RECENT_IMAGES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => typeof item === 'string' && item.startsWith('https://'))
        .slice(0, MAX_RECENT_IMAGES)
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

/**
 * Thêm một URL ảnh vào kho ảnh gần đây (đưa lên đầu, loại trùng lặp, tối đa 20 ảnh).
 * @param {string} url
 * @returns {string[]}
 */
export function addRecentImage(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('https://')) {
    return getRecentImages()
  }

  try {
    if (typeof localStorage === 'undefined') return []
    const current = getRecentImages()
    const filtered = current.filter((item) => item !== url)
    const updated = [url, ...filtered].slice(0, MAX_RECENT_IMAGES)
    localStorage.setItem(RECENT_IMAGES_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return getRecentImages()
  }
}

/**
 * Xóa toàn bộ kho ảnh gần đây.
 */
export function clearRecentImages() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(RECENT_IMAGES_KEY)
    }
  } catch {
    // Ignore
  }
}
