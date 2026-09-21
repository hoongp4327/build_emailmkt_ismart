import { escapeHtml, safeUrl, resolveFontStack } from '../helpers.js'
import { BRAND_COLORS } from '../../model/defaults.js'

/**
 * Render khối nút CTA.
 *
 * @param {import('../../model/types.js').ButtonBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderButtonBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const {
    label = 'Tìm hiểu thêm',
    url = '#',
    align = 'center',
    variant = 'outline',
    color = BRAND_COLORS.blue,
    fullWidth = false,
  } = props

  const paddingY = style.paddingTop ?? 8
  const paddingBottom = style.paddingBottom ?? 18
  const paddingX = style.paddingX ?? 0
  const bg = style.bg || 'transparent'

  const font = resolveFontStack(context.fontFamily)
  const safeLink = safeUrl(url, '#')

  const isOutline = variant === 'outline'
  const btnBg = isOutline ? 'transparent' : color
  const btnColor = isOutline ? color : '#ffffff'
  const btnBorder = `2px solid ${color}`
  const displayStyle = fullWidth ? 'display:block;width:100%;box-sizing:border-box;' : 'display:inline-block;'

  const buttonInlineStyle = `${displayStyle}padding:12px 24px;border:${btnBorder};background:${btnBg};border-radius:10px;color:${btnColor};font-family:${font} !important;font-size:14px;line-height:18px;font-weight:700;text-align:center;text-decoration:none;`

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:${bg};"><tr><td align="${align}" style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;text-align:${align};"><a href="${escapeHtml(safeLink)}" target="_blank" style="${escapeHtml(buttonInlineStyle)}">${escapeHtml(label)}</a></td></tr></table>`
}
