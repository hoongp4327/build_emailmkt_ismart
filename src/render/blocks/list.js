import { escapeHtml, resolveFontStack } from '../helpers.js'
import { sanitizeAndInlineRichText } from '../richText.js'
import { BRAND_COLORS } from '../../model/defaults.js'

/**
 * Render khối danh sách có biểu tượng / icon bullet.
 *
 * @param {import('../../model/types.js').ListBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderListBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const { items = [], marker = '📌', markerColor = BRAND_COLORS.orange } = props

  const paddingY = style.paddingTop ?? 10
  const paddingBottom = style.paddingBottom ?? 10
  const paddingX = style.paddingX ?? 34
  const bg = style.bg || 'transparent'

  const font = resolveFontStack(context.fontFamily)
  const textColor = context.textColor || '#254166'
  const fontSize = context.baseFontSize || 14

  const itemRows = items.map(item => {
    const textContent = sanitizeAndInlineRichText(item.html || '', {
      fontFamily: font,
      fontSize,
      color: textColor,
      align: 'justify',
      lineHeight: '22px',
    })

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:${font};"><tr><td valign="top" width="28" style="width:28px;padding:5px 0;color:${escapeHtml(markerColor)};font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;font-size:16px;line-height:22px;font-weight:700;">${escapeHtml(marker)}</td><td style="padding:5px 0;text-align:justify;color:${textColor};font-family:${font} !important;font-size:${fontSize}px;line-height:22px;">${textContent}</td></tr></table>`
  }).join('')

  return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};font-family:${font};">${itemRows}</td></tr>`
}
