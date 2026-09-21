import { sanitizeAndInlineRichText } from '../richText.js'
import { resolveFontStack } from '../helpers.js'

/**
 * Render khối văn bản rich text.
 *
 * @param {import('../../model/types.js').TextBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderTextBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const { html = '' } = props

  const paddingY = style.paddingTop ?? 12
  const paddingBottom = style.paddingBottom ?? 12
  const paddingX = style.paddingX ?? 34
  const align = style.align || 'justify'
  const bg = style.bg || 'transparent'

  const font = resolveFontStack(context.fontFamily)
  const textColor = context.textColor || '#254166'
  const fontSize = context.baseFontSize || 14

  const inlinedHtml = sanitizeAndInlineRichText(html, {
    fontFamily: font,
    fontSize,
    color: textColor,
    align,
    lineHeight: '23px',
  })

  return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};font-family:${font} !important;color:${textColor};text-align:${align};">${inlinedHtml}</td></tr>`
}
