import { escapeHtml } from '../helpers.js'

/**
 * Render khối đường kẻ phân cách (divider).
 *
 * @param {import('../../model/types.js').DividerBlock} block
 * @returns {string}
 */
export function renderDividerBlock(block) {
  const { props = {}, style = {} } = block
  const { color = '#d4e9f8', thickness = 1, widthPercent = 100 } = props

  const paddingY = style.paddingTop ?? 16
  const paddingBottom = style.paddingBottom ?? 16
  const paddingX = style.paddingX ?? 34
  const bg = style.bg || 'transparent'

  const pct = Math.min(100, Math.max(10, Number(widthPercent) || 100))

  return `<tr><td align="center" style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};font-size:0;line-height:0;"><table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0" border="0" style="width:${pct}%;border-collapse:collapse;margin:0 auto;"><tr><td style="border-top:${Number(thickness) || 1}px solid ${escapeHtml(color)};font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>`
}
