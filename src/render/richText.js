import { parseDocument } from 'htmlparser2'
import { escapeHtml, safeUrl, resolveFontStack } from './helpers.js'
import { BRAND_COLORS, DEFAULT_FONT } from '../model/defaults.js'

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'a', 'mark',
])

const DANGEROUS_TAGS = new Set([
  'script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg', 'canvas', 'template',
])

const ALLOWED_STYLES = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration',
  'color',
  'background-color',
  'line-height',
  'text-align',
])

/**
 * Phân tích và lọc các thuộc tính style theo whitelist nghiêm ngặt.
 * @param {string} [styleAttr]
 * @param {string} [fallbackFont]
 * @returns {Record<string, string>}
 */
function sanitizeStyles(styleAttr = '', fallbackFont = DEFAULT_FONT) {
  if (!styleAttr || typeof styleAttr !== 'string') return {}

  const result = {}
  const declarations = styleAttr.split(';')

  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':')
    if (colonIndex === -1) continue

    const prop = decl.slice(0, colonIndex).trim().toLowerCase()
    let value = decl.slice(colonIndex + 1).trim()

    if (!ALLOWED_STYLES.has(prop) || !value) continue

    // Loại bỏ biểu thức nguy hiểm trong CSS (expression, url, javascript)
    if (/(?:url\s*\(|expression\s*\(|javascript\s*:)/i.test(value)) {
      continue
    }

    if (prop === 'font-family') {
      value = resolveFontStack(value)
    } else if (prop === 'font-weight') {
      if (value === 'bold') value = '700'
      else if (value === 'normal') value = '400'
    }

    result[prop] = value
  }

  return result
}

/**
 * Chuyển object style thành chuỗi CSS inline.
 * @param {Record<string, string>} styles
 * @returns {string}
 */
function serializeStyles(styles) {
  const parts = []
  for (const [prop, val] of Object.entries(styles)) {
    if (val !== undefined && val !== null && val !== '') {
      parts.push(`${prop}:${val}`)
    }
  }
  return parts.length ? parts.join(';') + ';' : ''
}

/**
 * Chuyển đổi rich text từ TipTap / HTML người dùng thành HTML email inline-style an toàn.
 * Sử dụng htmlparser2 để parse AST chuẩn hóa cả trên Node lẫn Browser.
 *
 * @param {string} rawHtml
 * @param {Object} [options]
 * @param {string} [options.fontFamily]
 * @param {number} [options.fontSize]
 * @param {string} [options.color]
 * @param {string} [options.align]
 * @param {number|string} [options.lineHeight]
 * @returns {string}
 */
export function sanitizeAndInlineRichText(rawHtml = '', options = {}) {
  if (!rawHtml || typeof rawHtml !== 'string') return ''

  const defaultFont = resolveFontStack(options.fontFamily || DEFAULT_FONT)
  const defaultColor = options.color || BRAND_COLORS.text
  const defaultFontSize = options.fontSize ? `${options.fontSize}px` : '14px'
  const defaultLineHeight = options.lineHeight ? String(options.lineHeight) : '22px'
  const defaultAlign = options.align || 'left'

  const dom = parseDocument(rawHtml, { lowerCaseTags: true, lowerCaseAttributeNames: true })

  function renderNode(node) {
    if (!node) return ''

    // Text node: escape an toàn
    if (node.type === 'text') {
      return escapeHtml(node.data)
    }

    // Bỏ qua các thẻ nguy hiểm và toàn bộ nội dung bên trong nó
    if (DANGEROUS_TAGS.has(node.name) || node.type === 'script' || node.type === 'style') {
      return ''
    }

    // Các loại node khác (comment, directive...)
    if (node.type !== 'tag') {
      return ''
    }

    const tagName = node.name.toLowerCase()
    const childrenHtml = (node.children || []).map(renderNode).join('')

    // Nếu thẻ không nằm trong whitelist -> unwrap (giữ lại nội dung con an toàn)
    if (!ALLOWED_TAGS.has(tagName)) {
      return childrenHtml
    }

    if (tagName === 'br') {
      return '<br>'
    }

    const parsedStyles = sanitizeStyles(node.attribs?.style, defaultFont)

    if (tagName === 'p') {
      const pStyles = {
        margin: '0 0 12px',
        'font-family': parsedStyles['font-family'] || defaultFont,
        'font-size': parsedStyles['font-size'] || defaultFontSize,
        'line-height': parsedStyles['line-height'] || defaultLineHeight,
        color: parsedStyles['color'] || defaultColor,
        'text-align': parsedStyles['text-align'] || defaultAlign,
        ...parsedStyles,
      }
      return `<p style="${escapeHtml(serializeStyles(pStyles))}">${childrenHtml || '&nbsp;'}</p>`
    }

    if (tagName === 'strong' || tagName === 'b') {
      parsedStyles['font-weight'] = '700'
      if (!parsedStyles['font-family']) parsedStyles['font-family'] = defaultFont
      return `<strong style="${escapeHtml(serializeStyles(parsedStyles))}">${childrenHtml}</strong>`
    }

    if (tagName === 'em' || tagName === 'i') {
      parsedStyles['font-style'] = 'italic'
      if (!parsedStyles['font-family']) parsedStyles['font-family'] = defaultFont
      return `<em style="${escapeHtml(serializeStyles(parsedStyles))}">${childrenHtml}</em>`
    }

    if (tagName === 'u') {
      parsedStyles['text-decoration'] = 'underline'
      return `<u style="${escapeHtml(serializeStyles(parsedStyles))}">${childrenHtml}</u>`
    }

    if (tagName === 's') {
      parsedStyles['text-decoration'] = 'line-through'
      return `<s style="${escapeHtml(serializeStyles(parsedStyles))}">${childrenHtml}</s>`
    }

    if (tagName === 'a') {
      const rawHref = node.attribs?.href || ''
      const safeHref = safeUrl(rawHref, '#')
      const aColor = parsedStyles['color'] || BRAND_COLORS.blue
      const aStyles = {
        'text-decoration': 'underline',
        ...parsedStyles,
        color: aColor,
      }
      if (!parsedStyles['font-family']) aStyles['font-family'] = defaultFont
      // Không ép font-weight: 700 để link kế thừa độ đậm chữ xung quanh (Ràng buộc 2)
      return `<a href="${escapeHtml(safeHref)}" target="_blank" style="${escapeHtml(serializeStyles(aStyles))}">${childrenHtml}</a>`
    }

    if (tagName === 'mark') {
      // Chuyển <mark> thành <span style="background-color:..."> CHỈ giữ background-color, không padding/border-radius (Ràng buộc 4)
      const bgCol = node.attribs?.['data-color'] || parsedStyles['background-color'] || '#fff2a8'
      const markStyles = {
        ...parsedStyles,
        'background-color': bgCol,
      }
      if (!parsedStyles['font-family']) markStyles['font-family'] = defaultFont
      return `<span style="${escapeHtml(serializeStyles(markStyles))}">${childrenHtml}</span>`
    }

    if (tagName === 'span') {
      if (!parsedStyles['font-family']) parsedStyles['font-family'] = defaultFont
      const styleString = serializeStyles(parsedStyles)
      return styleString ? `<span style="${escapeHtml(styleString)}">${childrenHtml}</span>` : childrenHtml
    }

    return childrenHtml
  }

  const result = (dom.children || []).map(renderNode).join('')

  // Nếu chuỗi không có thẻ bao quanh, bọc bằng <p> chuẩn
  if (result && !result.trim().startsWith('<p') && !result.trim().startsWith('<div')) {
    return `<p style="margin:0 0 12px;font-family:${defaultFont};font-size:${defaultFontSize};line-height:${defaultLineHeight};color:${defaultColor};text-align:${defaultAlign};">${result}</p>`
  }

  return result
}

/**
 * Trích xuất nội dung văn bản thuần (plain text) từ HTML rich text.
 * @param {string} rawHtml
 * @returns {string}
 */
export function extractPlainText(rawHtml = '') {
  if (!rawHtml || typeof rawHtml !== 'string') return ''
  const dom = parseDocument(rawHtml)
  const chunks = []

  function walk(node) {
    if (!node) return
    if (DANGEROUS_TAGS.has(node.name) || node.type === 'script' || node.type === 'style') return
    if (node.type === 'text') {
      chunks.push(node.data)
      return
    }
    if (node.name === 'br' || node.name === 'p') {
      chunks.push('\n')
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child)
      }
    }
    if (node.name === 'p') {
      chunks.push('\n')
    }
  }

  for (const child of dom.children || []) {
    walk(child)
  }

  return chunks.join('').replace(/\n{3,}/g, '\n\n').trim()
}
