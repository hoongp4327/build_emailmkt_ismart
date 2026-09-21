import { parseDocument } from 'htmlparser2'
import { escapeHtml } from '../render/helpers.js'

/**
 * Giải mã các HTML entities cơ bản thành ký tự gốc để hiển thị trong textarea.
 * @param {string} str
 * @returns {string}
 */
function decodeHtmlEntities(str = '') {
  return str
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&#39;', "'")
}

/**
 * Chuyển đổi từ chuỗi HTML sang Text thuần có ký hiệu **đậm** để người dùng sửa trong textarea.
 * Sử dụng htmlparser2 để bóc tách thẻ chuẩn xác, không bao giờ để lộ thẻ HTML thô.
 *
 * @param {string} html
 * @returns {string}
 */
export function htmlToText(html = '') {
  if (!html || typeof html !== 'string') return ''

  const dom = parseDocument(html)
  const paragraphs = []
  let currentParagraph = []

  function walk(node) {
    if (!node) return

    // Bỏ qua script, style
    if (node.type === 'script' || node.type === 'style') return

    if (node.type === 'text') {
      currentParagraph.push(decodeHtmlEntities(node.data))
      return
    }

    if (node.type === 'tag') {
      const name = node.name?.toLowerCase()

      if (name === 'br') {
        currentParagraph.push('\n')
        return
      }

      const isBold = name === 'strong' || name === 'b'
      if (isBold) {
        currentParagraph.push('**')
      }

      if (node.children) {
        for (const child of node.children) {
          walk(child)
        }
      }

      if (isBold) {
        currentParagraph.push('**')
      }

      if (name === 'p') {
        const text = currentParagraph.join('').trim()
        if (text) {
          paragraphs.push(text)
        }
        currentParagraph = []
      }
    }
  }

  for (const child of dom.children || []) {
    walk(child)
  }

  // Thu hoạch phần text còn sót lại nếu không được bọc trong thẻ <p>
  if (currentParagraph.length) {
    const remaining = currentParagraph.join('').trim()
    if (remaining) {
      paragraphs.push(remaining)
    }
  }

  return paragraphs.join('\n\n')
}

/**
 * Chuyển đổi từ text thuần với cú pháp **đậm** và cách dòng sang HTML an toàn.
 * Quy tắc:
 * - 2 dòng trống (\n\n) -> thẻ <p>...</p>
 * - 1 dòng xuống (\n) -> thẻ <br>
 * - **nội dung** -> <strong>nội dung</strong>
 * - Không bao giờ escape 2 lần
 *
 * @param {string} text
 * @returns {string}
 */
export function textToHtml(text = '') {
  if (!text || typeof text !== 'string') return ''

  const normalized = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim()
  if (!normalized) return ''

  // Tách theo đoạn văn cách nhau bằng 2 dòng trở lên
  const rawParagraphs = normalized.split(/\n{2,}/)

  const htmlParagraphs = rawParagraphs
    .map(p => p.trim())
    .filter(Boolean)
    .map(para => {
      // 1. Escape HTML an toàn (kể cả ký tự & < > " ')
      const escaped = escapeHtml(para)

      // 2. Chuyển đổi cú pháp **đậm** thành <strong>
      const boldConverted = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

      // 3. Chuyển đổi dòng đơn (\n) thành <br>
      const withLineBreaks = boldConverted.replaceAll('\n', '<br>')

      return `<p>${withLineBreaks}</p>`
    })

  return htmlParagraphs.join('')
}
