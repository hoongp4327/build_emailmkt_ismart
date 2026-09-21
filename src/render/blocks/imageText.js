import { resolveFontStack, isValidHttpUrl, renderSafeImg } from '../helpers.js'
import { renderInnerBlocks } from '../innerBlocks.js'

/**
 * Render khối 2 cột: Ảnh + Văn bản (thay thế renderBenefits & renderRegistration cũ).
 * Nếu không có URL ảnh hợp lệ thì không render thẻ <img>, cột văn bản sẽ tự dãn 100%.
 *
 * @param {import('../../model/types.js').ImageTextBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderImageTextBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const {
    imagePosition = 'right',
    imageWidth = 132,
    src = '',
    alt = '',
    contentBlocks = [],
    boxed = false,
  } = props

  const paddingY = style.paddingTop ?? (boxed ? 0 : 26)
  const paddingBottom = style.paddingBottom ?? 28
  const paddingX = style.paddingX ?? 34
  const bg = style.bg || (boxed ? '#ffffff' : '#eef7fc')

  const font = resolveFontStack(context.fontFamily)
  const hasValidImg = isValidHttpUrl(src)
  const contentHtml = renderInnerBlocks(contentBlocks, context)

  const numImgWidth = Number(imageWidth) || 132

  const imgTd = hasValidImg
    ? `<td class="email-stack" valign="middle" align="center" width="${numImgWidth}" style="width:${numImgWidth}px;padding:0 0 10px;">${renderSafeImg({
        src,
        alt,
        width: numImgWidth,
        style: `display:block;width:${numImgWidth}px;max-width:100%;height:auto;margin:0 auto;border:0;`,
      })}</td>`
    : ''

  const textPadding = hasValidImg
    ? (imagePosition === 'left' ? 'padding:0 0 0 16px;' : 'padding:0 16px 0 0;')
    : 'padding:0;'

  const textTd = `<td class="email-stack" valign="middle" style="${textPadding}">${contentHtml}</td>`

  const columnsHtml = hasValidImg
    ? (imagePosition === 'left' ? `${imgTd}${textTd}` : `${textTd}${imgTd}`)
    : textTd

  const innerTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:${font};"><tr>${columnsHtml}</tr></table>`

  if (boxed) {
    return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#eef7fc;border:1px solid #d4e9f8;border-radius:16px;overflow:hidden;font-family:${font};"><tr><td style="padding:23px 20px;">${innerTable}</td></tr></table></td></tr>`
  }

  return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};">${innerTable}</td></tr>`
}
