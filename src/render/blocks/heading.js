import { escapeHtml, renderHeadingText, resolveFontStack } from '../helpers.js'
import { BRAND_COLORS } from '../../model/defaults.js'

/**
 * Render khối tiêu đề (heading).
 *
 * @param {import('../../model/types.js').HeadingBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderHeadingBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const { html = '', level = 2, color, fontSize } = props

  const paddingY = style.paddingTop ?? 16
  const paddingBottom = style.paddingBottom ?? 10
  const paddingX = style.paddingX ?? 34
  const align = style.align || 'left'
  const bg = style.bg || 'transparent'

  const font = resolveFontStack(context.fontFamily)
  const headingColor = color || (level === 1 ? BRAND_COLORS.navy : level === 2 ? BRAND_COLORS.navy : BRAND_COLORS.blue)

  const size = fontSize || (level === 1 ? 22 : level === 2 ? 19 : 16)
  const lineHeight = Math.round(size * 1.35)

  const formattedContent = renderHeadingText(html, font, headingColor)

  return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};"><div style="margin:0;font-family:${font} !important;font-size:${size}px;line-height:${lineHeight}px;font-weight:700;color:${escapeHtml(headingColor)};text-align:${align};">${formattedContent}</div></td></tr>`
}
