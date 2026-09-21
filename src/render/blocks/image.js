import { escapeHtml, safeUrl, isValidHttpUrl, renderSafeImg } from '../helpers.js'

/**
 * Render khối ảnh độc lập.
 * Nếu không có URL ảnh hợp lệ thì KHÔNG render thẻ <img>.
 *
 * @param {import('../../model/types.js').ImageBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderImageBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const { src, alt = '', width = 'full', align = 'center', link, radius = 0, caption } = props

  if (!isValidHttpUrl(src)) {
    return ''
  }

  const paddingY = style.paddingTop ?? (width === 'full' ? 0 : 15)
  const paddingBottom = style.paddingBottom ?? (width === 'full' ? 0 : 15)
  const paddingX = style.paddingX ?? (width === 'full' ? 0 : 34)
  const bg = style.bg || 'transparent'

  const isFull = width === 'full' || Number(width) >= 640
  const numWidth = isFull ? 640 : (Number(width) || 320)
  const widthAttr = numWidth
  const radiusVal = Number(radius) || 0
  const radiusStyle = `border-radius:${radiusVal}px;`

  const margin = align === 'left' ? '0;' : (align === 'right' ? '0 0 0 auto;' : '0 auto;')
  const imgStyle = isFull
    ? `display:block;width:100%;max-width:640px;height:auto;margin:0 auto;border:0;${radiusStyle}`
    : `display:block;width:${numWidth}px;max-width:100%;height:auto;margin:${margin}border:0;${radiusStyle}`

  const imgHtml = renderSafeImg({
    src,
    alt,
    width: widthAttr,
    style: imgStyle,
  })

  if (!imgHtml) return ''

  const linkedImg = link && safeUrl(link) !== '#'
    ? `<a href="${escapeHtml(safeUrl(link))}" target="_blank" style="text-decoration:none;display:inline-block;">${imgHtml}</a>`
    : imgHtml

  const captionHtml = caption
    ? `<div style="margin-top:6px;font-family:${context.fontFamily || 'Arial,Helvetica,sans-serif'};font-size:12px;line-height:16px;color:#666666;text-align:${align};">${escapeHtml(caption)}</div>`
    : ''

  return `<tr><td align="${align}" style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};font-size:0;line-height:0;">${linkedImg}${captionHtml}</td></tr>`
}
