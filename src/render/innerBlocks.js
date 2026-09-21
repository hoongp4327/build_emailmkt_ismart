import { sanitizeAndInlineRichText } from './richText.js'
import { escapeHtml, safeUrl, resolveFontStack, renderSafeImg, isValidHttpUrl, renderHeadingText } from './helpers.js'
import { renderButtonBlock } from './blocks/button.js'
import { BRAND_COLORS } from '../model/defaults.js'

/**
 * Render một block con nằm bên trong container block (infoCard, imageText, offerCards).
 * Tránh bọc thêm thẻ <tr>/<td> thừa để HTML email không bị vỡ.
 *
 * @param {import('../model/types.js').Block} block
 * @param {Object} context
 * @returns {string}
 */
export function renderInnerBlock(block, context = {}) {
  if (!block || block.style?.hidden) return ''
  const font = resolveFontStack(context.fontFamily)
  const textColor = context.textColor || BRAND_COLORS.text
  const fontSize = context.baseFontSize || 14

  switch (block.type) {
    case 'text': {
      const html = block.props?.html || ''
      return sanitizeAndInlineRichText(html, {
        fontFamily: font,
        fontSize,
        color: textColor,
        align: block.style?.align || 'justify',
        lineHeight: '22px',
      })
    }

    case 'list': {
      const items = block.props?.items || []
      const marker = block.props?.marker || '📌'
      const markerColor = block.props?.markerColor || BRAND_COLORS.orange
      return items.map(item => {
        const textContent = sanitizeAndInlineRichText(item.html || '', {
          fontFamily: font,
          fontSize,
          color: textColor,
          align: 'justify',
          lineHeight: '22px',
        })
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:${font};"><tr><td valign="top" width="28" style="width:28px;padding:4px 0;color:${escapeHtml(markerColor)};font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;font-size:16px;line-height:22px;font-weight:700;">${escapeHtml(marker)}</td><td style="padding:4px 0;text-align:justify;color:${textColor};font-family:${font} !important;font-size:${fontSize}px;line-height:22px;">${textContent}</td></tr></table>`
      }).join('')
    }

    case 'heading': {
      const { html = '', level = 2, color, fontSize } = block.props || {}
      const headingColor = color || (level === 1 ? BRAND_COLORS.navy : BRAND_COLORS.blue)
      const size = fontSize || (level === 1 ? 22 : level === 2 ? 19 : 16)
      const lineHeight = Math.round(size * 1.35)
      const headingContent = renderHeadingText(html, font, headingColor)
      return `<div style="margin:0 0 10px;font-family:${font} !important;font-size:${size}px;line-height:${lineHeight}px;font-weight:700;color:${escapeHtml(headingColor)};">${headingContent}</div>`
    }

    case 'button': {
      return renderButtonBlock(block, context)
    }

    case 'image': {
      const { src, alt = '', width, link } = block.props || {}
      if (!isValidHttpUrl(src)) return ''
      const imgWidth = width === 'full' ? '100%' : (Number(width) || '100%')
      const imgHtml = renderSafeImg({
        src,
        alt,
        width: typeof width === 'number' ? width : undefined,
        style: `display:block;max-width:100%;width:${imgWidth};height:auto;margin:0 auto;border:0;`,
      })
      if (!imgHtml) return ''
      return link && safeUrl(link) !== '#'
        ? `<a href="${escapeHtml(safeUrl(link))}" target="_blank" style="text-decoration:none;">${imgHtml}</a>`
        : imgHtml
    }

    default:
      return ''
  }
}

/**
 * Render mảng các block con liên tiếp bên trong container.
 * @param {import('../model/types.js').Block[]} [blocks]
 * @param {Object} [context]
 * @returns {string}
 */
export function renderInnerBlocks(blocks = [], context = {}) {
  return blocks.map(b => renderInnerBlock(b, context)).filter(Boolean).join('')
}
