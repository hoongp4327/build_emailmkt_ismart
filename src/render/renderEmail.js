import { resolveFontStack, escapeHtml } from './helpers.js'
import { extractPlainText } from './richText.js'
import { DEFAULT_SETTINGS } from '../model/defaults.js'

import { renderImageBlock } from './blocks/image.js'
import { renderHeadingBlock } from './blocks/heading.js'
import { renderTextBlock } from './blocks/text.js'
import { renderListBlock } from './blocks/list.js'
import { renderInfoCardBlock } from './blocks/infoCard.js'
import { renderImageTextBlock } from './blocks/imageText.js'
import { renderOfferCardsBlock } from './blocks/offerCards.js'
import { renderButtonBlock } from './blocks/button.js'
import { renderPaymentBlock } from './blocks/payment.js'
import { renderDividerBlock } from './blocks/divider.js'
import { renderSpacerBlock } from './blocks/spacer.js'
import { renderFooterBlock } from './blocks/footer.js'

const RENDERERS = {
  image: renderImageBlock,
  heading: renderHeadingBlock,
  text: renderTextBlock,
  list: renderListBlock,
  infoCard: renderInfoCardBlock,
  imageText: renderImageTextBlock,
  offerCards: renderOfferCardsBlock,
  button: renderButtonBlock,
  payment: renderPaymentBlock,
  divider: renderDividerBlock,
  spacer: renderSpacerBlock,
  footer: renderFooterBlock,
}

/**
 * Trích xuất nội dung văn bản thuần (plain text) từ từng block.
 * @param {import('../model/types.js').Block} block
 * @returns {string}
 */
function extractBlockPlainText(block) {
  if (!block || block.style?.hidden) return ''
  const p = block.props || {}

  switch (block.type) {
    case 'heading':
      return p.html ? `\n## ${extractPlainText(p.html)}\n` : ''

    case 'text':
      return p.html ? `${extractPlainText(p.html)}\n` : ''

    case 'list': {
      const items = p.items || []
      const marker = p.marker || '•'
      return items.map(item => `${marker} ${extractPlainText(item.html || '')}`).join('\n') + '\n'
    }

    case 'button':
      return p.label ? `[${p.label}: ${p.url || ''}]\n` : ''

    case 'infoCard': {
      const header = p.title ? `\n## ${p.title}\n` : ''
      const body = (p.bodyBlocks || []).map(extractBlockPlainText).join('\n')
      return `${header}${body}`
    }

    case 'imageText': {
      return (p.contentBlocks || []).map(extractBlockPlainText).join('\n')
    }

    case 'offerCards': {
      const title = p.title ? `\n## ${p.title}\n` : ''
      const sub = p.subtitle ? `${p.subtitle}\n` : ''
      const cardsText = (p.cards || []).map(c => `### ${c.title}\n${(c.contentBlocks || []).map(extractBlockPlainText).join('\n')}`).join('\n')
      return `${title}${sub}${cardsText}`
    }

    case 'payment': {
      const parts = [`\n## ${p.title || 'THÔNG TIN CHUYỂN KHOẢN'}`]
      if (p.bankName) parts.push(`Ngân hàng: ${p.bankName}`)
      if (p.accountNo) parts.push(`Số tài khoản: ${p.accountNo}`)
      if (p.accountName) parts.push(`Chủ tài khoản: ${p.accountName}`)
      if (p.amount) parts.push(`Số tiền: ${Number(p.amount).toLocaleString('vi-VN')} VNĐ`)
      if (p.transferContent) parts.push(`Nội dung CK: ${p.transferContent}`)
      if (p.note) parts.push(`Ghi chú: ${extractPlainText(p.note)}`)
      return parts.join('\n') + '\n'
    }

    case 'footer': {
      if (p.closingLine || p.signOff) {
        return `\n${p.closingLine || ''}\n${p.signOff || ''}\n`
      }
      return p.html ? `\n${extractPlainText(p.html)}\n` : ''
    }

    default:
      return ''
  }
}

/**
 * Render đối tượng EmailDoc thành HTML email hoàn chỉnh.
 * Hàm thuần (pure function) KHÔNG sinh ID ngẫu nhiên, cho output ổn định 100%.
 *
 * @param {import('../model/types.js').EmailDoc} doc
 * @param {Object} [options]
 * @param {boolean} [options.previewMode] Nếu true, gắn thuộc tính data-block-id vào preview
 * @returns {{ fragment: string, document: string, plainText: string }}
 */
export function renderEmail(doc, options = {}) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(doc?.settings || {}),
  }

  const fontFamily = resolveFontStack(settings.fontFamily)
  const outerBg = settings.outerBg || '#eef7fc'
  const contentBg = settings.contentBg || '#ffffff'
  const width = Number(settings.width) || 640
  const radius = Number(settings.radius) ?? 22

  const context = {
    fontFamily,
    baseFontSize: settings.baseFontSize || 14,
    textColor: settings.textColor || '#254166',
    palette: settings.palette || DEFAULT_SETTINGS.palette,
    previewMode: Boolean(options.previewMode),
  }

  const blocks = doc?.blocks || []

  // Render từng block
  const renderedBlocks = blocks
    .filter(block => !block.style?.hidden)
    .map((block, index) => {
      const renderer = RENDERERS[block.type]
      if (!renderer) return ''

      let blockHtml = renderer(block, context)
      if (!blockHtml) return ''

      // Gắn data-block-id chỉ khi đang ở chế độ xem trước (previewMode), KHÔNG có trong bản copy/gửi
      if (context.previewMode && block.id) {
        blockHtml = blockHtml.replace('<td', `<td data-block-id="${escapeHtml(block.id)}"`)
      }

      return blockHtml
    })
    .filter(Boolean)
    .join('')

  const fragment = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background:${outerBg};border-collapse:collapse;font-family:${fontFamily};"><tr><td align="center" style="padding:20px 8px;"><table role="presentation" width="${width}" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:${width}px;background:${contentBg};border-collapse:separate;border-spacing:0;border-radius:${radius}px;overflow:hidden;font-family:${fontFamily};"><tbody>${renderedBlocks}</tbody></table></td></tr></table>`

  const document = `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>iSMART Email</title><style>body,table,tbody,tr,td,div,p,a,span,strong{font-family:${fontFamily}!important}@media only screen and (max-width:640px){table[width="${width}"]{width:100%!important}.email-stack{display:block!important;width:100%!important}}</style></head><body style="margin:0;padding:0;background:${outerBg};font-family:${fontFamily};">${fragment}</body></html>`

  const plainText = blocks
    .map(extractBlockPlainText)
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { fragment, document, plainText }
}
