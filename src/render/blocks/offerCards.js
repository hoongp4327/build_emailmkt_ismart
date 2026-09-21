import { escapeHtml, renderHeadingText, resolveFontStack } from '../helpers.js'
import { renderInnerBlocks } from '../innerBlocks.js'
import { BRAND_COLORS } from '../../model/defaults.js'

/**
 * Render khối Ưu đãi đặc biệt gồm header màu cam và các card con (thay thế renderOffer cũ).
 *
 * @param {import('../../model/types.js').OfferCardsBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderOfferCardsBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const {
    title = 'ƯU ĐÃI ĐẶC BIỆT',
    subtitle = '',
    cards = [],
    columns = 2,
  } = props

  const paddingY = style.paddingTop ?? 30
  const paddingBottom = style.paddingBottom ?? 34
  const paddingX = style.paddingX ?? 34
  const bg = style.bg || '#ffffff'

  const font = resolveFontStack(context.fontFamily)
  const cardWidth = columns === 1 || cards.length === 1 ? '100%' : '50%'

  const cardsHtml = cards.map(card => {
    const cardContent = renderInnerBlocks(card.contentBlocks || [], context)
    return `<td class="email-stack" valign="top" width="${cardWidth}" style="width:${cardWidth};padding:6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #ffd2b8;border-radius:12px;font-family:${font};"><tr><td style="padding:16px;"><div style="margin-bottom:10px;color:${BRAND_COLORS.blue};font-family:${font} !important;font-size:18px;line-height:24px;font-weight:700;">${renderHeadingText(card.title, font, BRAND_COLORS.blue)}</div>${cardContent}</td></tr></table></td>`
  }).join('')

  const subtitleHtml = subtitle
    ? `<div style="margin-top:6px;font-family:${font} !important;font-size:14px;line-height:22px;font-weight:700;">${escapeHtml(subtitle)}</div>`
    : ''

  return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#fff8f1;border:1px solid #ffd2b8;border-radius:17px;overflow:hidden;font-family:${font};"><tr><td align="center" style="padding:20px;background:${BRAND_COLORS.orange};color:#ffffff;font-family:${font} !important;"><div style="font-family:${font} !important;font-size:19px;line-height:27px;font-weight:700;">${renderHeadingText(title, font, '#ffffff')}</div>${subtitleHtml}</td></tr><tr><td style="padding:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:${font};"><tr>${cardsHtml}</tr></table></td></tr></table></td></tr>`
}
