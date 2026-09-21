import { escapeHtml, resolveFontStack } from '../helpers.js'
import { sanitizeAndInlineRichText } from '../richText.js'
import { BRAND_COLORS } from '../../model/defaults.js'

/**
 * Render khối chân trang / kết thư (thay thế closing line + Trân trọng cũ).
 *
 * @param {import('../../model/types.js').FooterBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderFooterBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const {
    html = '',
    closingLine,
    signOff,
    bg = BRAND_COLORS.navy,
    color = '#ffffff',
  } = props

  const paddingY = style.paddingTop ?? 25
  const paddingBottom = style.paddingBottom ?? 34
  const paddingX = style.paddingX ?? 34

  const font = resolveFontStack(context.fontFamily)

  let contentHtml = ''
  if (closingLine || signOff) {
    const topText = closingLine ? `<div style="font-family:${font} !important;font-size:19px;line-height:28px;font-weight:700;color:${escapeHtml(color)};">${escapeHtml(closingLine)}</div>` : ''
    const bottomText = signOff ? `<div style="margin-top:13px;font-family:${font} !important;font-size:14px;line-height:22px;color:${escapeHtml(color)};">${escapeHtml(signOff)}</div>` : ''
    contentHtml = `${topText}${bottomText}`
  } else {
    contentHtml = sanitizeAndInlineRichText(html, {
      fontFamily: font,
      fontSize: 14,
      color,
      align: style.align || 'center',
      lineHeight: '22px',
    })
  }

  return `<tr><td align="center" style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${escapeHtml(bg)};color:${escapeHtml(color)};font-family:${font} !important;text-align:${style.align || 'center'};">${contentHtml}</td></tr>`
}
