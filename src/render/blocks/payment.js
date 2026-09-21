import { escapeHtml, renderHeadingText, resolveFontStack, isValidHttpUrl, renderSafeImg } from '../helpers.js'
import { sanitizeAndInlineRichText } from '../richText.js'
import { BRAND_COLORS } from '../../model/defaults.js'


/**
 * Render khối Chuyển khoản QR thanh toán.
 * QUY TẮC BẮT BUỘC: Nếu thiếu ảnh QR hoặc URL không hợp lệ thì KHÔNG render thẻ <img>,
 * nhưng VẪN render đầy đủ 100% bảng thông tin chuyển khoản dạng văn bản.
 *
 * @param {import('../../model/types.js').PaymentBlock} block
 * @param {Object} context
 * @returns {string}
 */
export function renderPaymentBlock(block, context = {}) {
  const { props = {}, style = {} } = block
  const {
    title = 'THÔNG TIN CHUYỂN KHOẢN',
    bankName = '',
    accountNo = '',
    accountName = '',
    amount,
    transferContent = '',
    qrImageUrl = '',
    qrSize = 200,
    layout = 'qr-left',
    note = '',
    accentColor = BRAND_COLORS.navy,
  } = props

  const paddingY = style.paddingTop ?? 20
  const paddingBottom = style.paddingBottom ?? 28
  const paddingX = style.paddingX ?? 34
  const bg = style.bg || '#ffffff'

  const font = resolveFontStack(context.fontFamily)
  const hasQr = isValidHttpUrl(qrImageUrl)
  const numQrSize = Number(qrSize) || 200

  // 1. Cột thông tin chuyển khoản (luôn có)
  const formattedAcc = accountNo ? escapeHtml(String(accountNo).trim()) : ''
  const formattedAmount = typeof amount === 'number' && amount > 0
    ? `${amount.toLocaleString('vi-VN')} VNĐ`
    : ''

  const rows = []
  if (bankName) {
    rows.push(`<tr><td valign="top" style="padding:4px 0;width:115px;color:#555555;font-size:13px;line-height:20px;">Ngân hàng:</td><td valign="top" style="padding:4px 0;font-weight:700;color:${BRAND_COLORS.text};font-size:14px;line-height:20px;">${escapeHtml(bankName)}</td></tr>`)
  }
  if (formattedAcc) {
    rows.push(`<tr><td valign="top" style="padding:4px 0;width:115px;color:#555555;font-size:13px;line-height:24px;">Số tài khoản:</td><td valign="top" style="padding:4px 0;font-weight:700;color:${escapeHtml(accentColor)};font-size:17px;line-height:24px;letter-spacing:0.5px;">${escapeHtml(formattedAcc)}</td></tr>`)
  }
  if (accountName) {
    rows.push(`<tr><td valign="top" style="padding:4px 0;width:115px;color:#555555;font-size:13px;line-height:20px;">Chủ tài khoản:</td><td valign="top" style="padding:4px 0;font-weight:700;color:${BRAND_COLORS.text};font-size:14px;line-height:20px;text-transform:uppercase;">${escapeHtml(accountName)}</td></tr>`)
  }
  if (formattedAmount) {
    rows.push(`<tr><td valign="top" style="padding:4px 0;width:115px;color:#555555;font-size:13px;line-height:20px;">Số tiền:</td><td valign="top" style="padding:4px 0;font-weight:700;color:${BRAND_COLORS.orange};font-size:16px;line-height:20px;">${escapeHtml(formattedAmount)}</td></tr>`)
  }
  if (transferContent) {
    rows.push(`<tr><td valign="top" style="padding:6px 0;width:115px;color:#555555;font-size:13px;line-height:22px;">Nội dung CK:</td><td valign="top" style="padding:6px 0;"><span style="display:inline-block;padding:3px 8px;background:#fff2e8;border:1px dashed ${BRAND_COLORS.orange};border-radius:4px;font-family:'Courier New',Courier,monospace;font-weight:700;font-size:14px;color:${BRAND_COLORS.text};">${escapeHtml(transferContent)}</span></td></tr>`)
  }

  const infoTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:${font};">${rows.join('')}</table>`

  // 2. Cột QR code
  const qrImgHtml = hasQr ? renderSafeImg({
    src: qrImageUrl,
    alt: 'Mã QR thanh toán',
    width: numQrSize,
    style: `display:block;width:${numQrSize}px;max-width:100%;height:auto;margin:0 auto;border:0;border-radius:8px;background:#ffffff;padding:8px;box-sizing:border-box;`,
  }) : ''

  const qrBox = hasQr ? `<td class="email-stack" align="center" valign="middle" width="${numQrSize + 20}" style="width:${numQrSize + 20}px;padding:10px 12px;text-align:center;">${qrImgHtml}<div style="margin-top:6px;font-size:11px;line-height:15px;color:#666666;">Quét mã bằng app ngân hàng</div></td>` : ''

  let bodyContent = ''

  if (!hasQr) {
    // Không có QR -> Hiển thị 100% bảng thông tin
    bodyContent = `<tr><td style="padding:16px 20px;">${infoTable}</td></tr>`
  } else if (layout === 'qr-top') {
    bodyContent = `<tr><td align="center" style="padding:16px 16px 8px;text-align:center;">${qrImgHtml}<div style="margin-top:6px;font-size:11px;line-height:15px;color:#666666;">Quét mã bằng app ngân hàng</div></td></tr><tr><td style="padding:8px 20px 16px;">${infoTable}</td></tr>`
  } else if (layout === 'qr-right') {
    bodyContent = `<tr><td style="padding:16px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:${font};"><tr><td class="email-stack" valign="middle" style="padding-right:16px;">${infoTable}</td>${qrBox}</tr></table></td></tr>`
  } else {
    // qr-left (mặc định)
    bodyContent = `<tr><td style="padding:16px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:${font};"><tr>${qrBox}<td class="email-stack" valign="middle" style="padding-left:16px;">${infoTable}</td></tr></table></td></tr>`
  }

  // 3. Dòng ghi chú nếu có
  const noteHtml = note
    ? `<tr><td style="padding:10px 20px 16px;font-size:12px;line-height:18px;color:#666666;border-top:1px solid #e1effa;">${sanitizeAndInlineRichText(note, { fontFamily: font, fontSize: 12, color: '#666666' })}</td></tr>`
    : ''

  return `<tr><td style="padding:${paddingY}px ${paddingX}px ${paddingBottom}px;background:${bg};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#eef7fc;border:1px solid #d4e9f8;border-radius:16px;overflow:hidden;font-family:${font};"><tr><td style="padding:14px 20px;background:${escapeHtml(accentColor)};color:#ffffff;font-family:${font} !important;font-size:17px;line-height:23px;font-weight:700;">${renderHeadingText(title, font, '#ffffff')}</td></tr>${bodyContent}${noteHtml}</table></td></tr>`
}
