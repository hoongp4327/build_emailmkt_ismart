import { parseDocument } from 'htmlparser2'
import { BRAND_COLORS, SAFE_FONTS, DEFAULT_FONT } from '../model/defaults.js'

export const COLORS = BRAND_COLORS

/**
 * Escape chuỗi văn bản cho HTML an toàn.
 * @param {string} [value]
 * @returns {string}
 */
export function escapeHtml(value = '') {
  if (value === null || value === undefined) return ''
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/**
 * Kiểm tra xem URL có phải là URL HTTP/HTTPS công khai hợp lệ hay không.
 * Tuyệt đối không cho phép data:, blob:, javascript:
 * @param {string} value
 * @returns {boolean}
 */
export function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.toLowerCase().startsWith('javascript:')) {
    return false
  }
  try {
    const url = new URL(trimmed)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Xác thực và chuẩn hóa URL cho email.
 * Chỉ cho phép http:, https:, tel:, mailto:. Mọi URL khác trả về fallback.
 * @param {string} value
 * @param {string} [fallback]
 * @returns {string}
 */
export function safeUrl(value, fallback = '#') {
  if (!value || typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return fallback
  }
  try {
    const url = new URL(trimmed)
    return ['http:', 'https:', 'tel:', 'mailto:'].includes(url.protocol) ? url.href : fallback
  } catch {
    return fallback
  }
}

/**
 * Kiểm tra font có nằm trong danh sách 6 web-safe fonts hay không.
 * Nếu không nằm trong danh sách thì tự động fallback về Arial stack.
 * @param {string} [fontFamily]
 * @returns {string}
 */
export function resolveFontStack(fontFamily) {
  if (!fontFamily || typeof fontFamily !== 'string') return DEFAULT_FONT
  const normalized = fontFamily.trim().toLowerCase()
  const matched = SAFE_FONTS.find(f => f.toLowerCase() === normalized)
  if (matched) return matched

  // So sánh tên họ font chính (Arial, Tahoma, Verdana, Trebuchet, Georgia, Times)
  if (normalized.includes('tahoma')) return 'Tahoma, Geneva, sans-serif'
  if (normalized.includes('verdana')) return 'Verdana, Geneva, sans-serif'
  if (normalized.includes('trebuchet')) return "'Trebuchet MS', Helvetica, sans-serif"
  if (normalized.includes('georgia')) return "Georgia, 'Times New Roman', serif"
  if (normalized.includes('times')) return "'Times New Roman', Times, serif"
  if (normalized.includes('arial') || normalized.includes('helvetica')) return 'Arial, Helvetica, sans-serif'

  return DEFAULT_FONT
}

/**
 * Render tiêu đề có tách emoji ra font Segoe UI Emoji để hiển thị đẹp.
 * @param {string} value
 * @param {string} [fontFamily]
 * @param {string} [color]
 * @returns {string}
 */
export function renderHeadingText(value = '', fontFamily = DEFAULT_FONT, color = BRAND_COLORS.navy) {
  const resolvedFont = resolveFontStack(fontFamily)
  const dom = parseDocument(String(value))
  const chunks = []
  function walk(node) {
    if (!node) return
    const name = node.name?.toLowerCase()
    if (name === 'script' || name === 'style' || name === 'noscript' || name === 'iframe' || name === 'object' || name === 'svg' || node.type === 'script' || node.type === 'style') return
    if (node.type === 'text') {
      chunks.push(node.data)
      return
    }
    if (node.children) {
      for (const child of node.children) walk(child)
    }
  }
  for (const child of dom.children || []) walk(child)
  const cleaned = chunks.join('').trim()

  const match = cleaned.match(/^([^\p{L}\p{N}#]+)\s*(.+)$/u)
  if (!match) {
    return `<span style="font-family:${resolvedFont} !important;color:${escapeHtml(color)};">${escapeHtml(cleaned)}</span>`
  }
  return `<span style="font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;font-weight:400;">${escapeHtml(match[1].trim())}</span><span style="font-family:${resolvedFont} !important;font-weight:700;color:${escapeHtml(color)};"> ${escapeHtml(match[2])}</span>`
}

/**
 * Render thẻ <img> an toàn.
 * QUY TẮC BẮT BUỘC: Nếu không có URL ảnh hợp lệ thì KHÔNG render thẻ <img> (không để src rỗng).
 * @param {Object} options
 * @param {string} options.src
 * @param {string} options.alt
 * @param {number|string} [options.width]
 * @param {string} [options.style]
 * @returns {string}
 */
export function renderSafeImg({ src, alt = '', width, style = '' }) {
  if (!isValidHttpUrl(src)) return ''
  const cleanSrc = escapeHtml(src.trim())
  const cleanAlt = escapeHtml(alt)
  const widthAttr = width !== undefined && width !== null ? ` width="${escapeHtml(String(width))}"` : ''
  const finalStyle = style || 'display:block;max-width:100%;height:auto;border:0;'

  return `<img src="${cleanSrc}" alt="${cleanAlt}"${widthAttr} style="${escapeHtml(finalStyle)}">`
}
