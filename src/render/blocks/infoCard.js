import { escapeHtml, renderHeadingText, resolveFontStack } from '../helpers.js'
import { renderInnerBlocks } from '../innerBlocks.js'
import { BRAND_COLORS } from '../../model/defaults.js'

/**
 * Render khối Info Card (thay thế renderInfo cũ).
 *
 * @param {import('../../model/types.js').InfoCardBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderInfoCardBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const {
    title = 'THÔNG TIN',
    headerBg = BRAND_COLORS.navy,
    headerColor = '#ffffff',
    bodyBlocks = [],
  } = props

  const paddingY = style.paddingTop ?? 0
  const paddingBottom = style.paddingBottom ?? 28
  const paddingX = style.paddingX ?? 34
  const bg = style.bg || '#ffffff'

  const font = resolveFontStack(context.fontFamily)
  const bodyContent = renderInnerBlocks(bodyBlocks, context)

  return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d4e9f8;border-radius:16px;overflow:hidden;background:#ffffff;font-family:${font};"><tr><td style="padding:17px 22px;background:${escapeHtml(headerBg)};color:${escapeHtml(headerColor)};font-family:${font} !important;font-size:19px;line-height:25px;font-weight:700;">${renderHeadingText(title, font, headerColor)}</td></tr><tr><td style="padding:14px 22px 18px;">${bodyContent}</td></tr></table></td></tr>`
}
