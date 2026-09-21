import { parseDocument } from 'htmlparser2'
import { escapeHtml, safeUrl } from '../../render/helpers.js'

const ALLOWED_EXTERNAL_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'strike', 'a',
])

const DANGEROUS_TAGS = new Set([
  'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg', 'canvas', 'template', 'meta', 'xml', 'img',
])

/**
 * Xử lý và làm sạch HTML khi dán vào TipTap editor.
 *
 * Ràng buộc:
 * 1. Nếu có `data-pm-slice` (copy nội bộ từ TipTap trong app) -> giữ nguyên font, cỡ, màu, nền.
 * 2. Nếu từ nguồn ngoài (Word, Google Docs, web):
 *    - Bóc wrapper <b style="font-weight:normal" id="docs-internal-guid-..."> của Google Docs (không để đậm cả đoạn).
 *    - Bỏ toàn bộ font-family, font-size (kể cả cỡ pt), color, background, mso-*.
 *    - Bỏ toàn bộ thẻ <img>.
 *    - Chỉ giữ: đoạn, xuống dòng, đậm, nghiêng, gạch chân, gạch ngang, link.
 * 3. Nếu là ô 1 dòng (singleLine: true) -> nối nhiều dòng/đoạn thành 1 dòng bằng dấu cách.
 *
 * @param {string} html
 * @param {Object} [options]
 * @param {boolean} [options.singleLine=false]
 * @returns {string}
 */
export function cleanPastedHTML(html = '', options = {}) {
  if (!html || typeof html !== 'string') return ''

  const { singleLine = false } = options

  // 1. Kiểm tra copy nội bộ từ TipTap (TipTap luôn sinh data-pm-slice khi copy)
  if (html.includes('data-pm-slice')) {
    if (singleLine) {
      return html
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
        .replace(/<\/?p[^>]*>/gi, '')
        .replace(/[\r\n]+/g, ' ')
        .trim()
    }
    return html
  }

  // 2. Xử lý nguồn ngoài (Google Docs, Word, Web)
  const dom = parseDocument(html, { lowerCaseTags: true, lowerCaseAttributeNames: true })

  function renderNode(node) {
    if (!node) return ''

    if (node.type === 'text') {
      const text = node.data || ''
      return singleLine ? escapeHtml(text.replace(/[\r\n]+/g, ' ')) : escapeHtml(text)
    }

    if (node.type !== 'tag') return ''

    const tagName = node.name.toLowerCase()

    // Bỏ thẻ nguy hiểm hoặc thẻ rác Word/Web (kể cả <img>)
    if (DANGEROUS_TAGS.has(tagName) || tagName.startsWith('o:') || tagName.startsWith('w:')) {
      return ''
    }

    // Xử lý đặc thù Google Docs: <b style="font-weight:normal" id="docs-internal-guid-...">
    // Nếu là b/strong mang font-weight:normal hoặc id chứa docs-internal-guid -> UNWRAP (không làm đậm)
    const styleAttr = (node.attribs?.style || '').toLowerCase()
    const idAttr = (node.attribs?.id || '').toLowerCase()
    const isGoogleDocsNormalWrapper =
      (tagName === 'b' || tagName === 'strong') &&
      (styleAttr.includes('font-weight:normal') ||
        styleAttr.includes('font-weight: 400') ||
        idAttr.includes('docs-internal-guid'))

    const childrenHtml = (node.children || []).map(renderNode).join('')

    if (isGoogleDocsNormalWrapper) {
      return childrenHtml
    }

    // Xử lý danh sách: ul, ol bóc vỏ; mỗi li thành 1 đoạn <p> riêng biệt
    if (tagName === 'ul' || tagName === 'ol') {
      return childrenHtml
    }

    if (tagName === 'li') {
      const trimmed = childrenHtml.trim()
      if (!trimmed) return ''
      if (singleLine) {
        return `${trimmed.replace(/<\/?p[^>]*>/gi, '')} `
      }
      if (trimmed.startsWith('<p>') || trimmed.startsWith('<p ')) {
        return childrenHtml
      }
      return `<p>${childrenHtml}</p>`
    }

    // Xử lý tiêu đề: h1 - h6 thành <p><strong>...</strong></p>
    if (/^h[1-6]$/.test(tagName)) {
      const trimmed = childrenHtml.trim()
      if (!trimmed) return ''
      if (singleLine) {
        return `<strong>${childrenHtml}</strong> `
      }
      return `<p><strong>${childrenHtml}</strong></p>`
    }

    // Xử lý blockquote, pre, code: unwrap giữ lại text và định dạng con
    if (tagName === 'blockquote' || tagName === 'pre' || tagName === 'code') {
      return childrenHtml
    }

    // Nếu là ô 1 dòng: không cho phép sinh thẻ block <p> hoặc <br>, thay bằng dấu cách
    if (singleLine) {
      if (tagName === 'p' || tagName === 'br' || tagName === 'div') {
        return childrenHtml ? `${childrenHtml} ` : ' '
      }
    }

    // Nếu không nằm trong whitelist -> unwrap hoặc giữ định dạng ngữ nghĩa nếu là span
    if (!ALLOWED_EXTERNAL_TAGS.has(tagName)) {
      if (tagName === 'span') {
        let content = childrenHtml
        if (/font-weight:\s*(bold|[7-9]00)/i.test(styleAttr)) {
          content = `<strong>${content}</strong>`
        }
        if (/font-style:\s*italic/i.test(styleAttr)) {
          content = `<em>${content}</em>`
        }
        if (/text-decoration:\s*[^;]*underline/i.test(styleAttr)) {
          content = `<u>${content}</u>`
        }
        if (/text-decoration:\s*[^;]*line-through/i.test(styleAttr)) {
          content = `<s>${content}</s>`
        }
        return content
      }
      return childrenHtml
    }

    if (tagName === 'br') {
      return singleLine ? ' ' : '<br>'
    }

    if (tagName === 'p') {
      const trimmed = childrenHtml.trim()
      return trimmed ? `<p>${childrenHtml}</p>` : ''
    }

    if (tagName === 'strong' || tagName === 'b') {
      return `<strong>${childrenHtml}</strong>`
    }

    if (tagName === 'em' || tagName === 'i') {
      return `<em>${childrenHtml}</em>`
    }

    if (tagName === 'u') {
      return `<u>${childrenHtml}</u>`
    }

    if (tagName === 's' || tagName === 'del' || tagName === 'strike') {
      return `<s>${childrenHtml}</s>`
    }

    if (tagName === 'a') {
      const rawHref = node.attribs?.href || ''
      const validHref = safeUrl(rawHref, '#')
      return `<a href="${escapeHtml(validHref)}">${childrenHtml}</a>`
    }

    return childrenHtml
  }

  let result = (dom.children || []).map(renderNode).join('')

  if (singleLine) {
    result = result
      .replace(/[\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  return result
}
