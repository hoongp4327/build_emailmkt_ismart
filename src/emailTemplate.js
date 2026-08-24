const COLORS = {
  navy: '#082e6f',
  blue: '#0870c5',
  orange: '#ff641c',
  lime: '#80b600',
  text: '#254166',
  pale: '#eef7fc',
}

const escapeHtml = (value = '') =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const safeUrl = (value, fallback = '#') => {
  try {
    const url = new URL(value)
    return ['http:', 'https:', 'tel:', 'mailto:'].includes(url.protocol) ? url.href : fallback
  } catch {
    return fallback
  }
}

const inlineBold = (value) => {
  const escaped = escapeHtml(value)
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong style="font-family:Arial,Helvetica,sans-serif !important;font-weight:700;">$1</strong>')
}

const renderHeadingText = (value) => {
  const match = value.match(/^([^\p{L}\p{N}#]+)\s*(.+)$/u)
  if (!match) return escapeHtml(value)
  return `<span style="font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;font-weight:400;">${escapeHtml(match[1].trim())}</span><span style="font-family:Arial,Helvetica,sans-serif !important;font-weight:700;"> ${escapeHtml(match[2])}</span>`
}

const stripMarkers = (line) => line.replace(/^(📌|✓|⏰|☎|👉|-|•)\s*/, '')

const parseDocument = (source) => {
  const lines = source.replaceAll('\r\n', '\n').split('\n')
  const preamble = []
  const sections = []
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      current = { title: line.slice(3).trim(), lines: [] }
      sections.push(current)
      continue
    }
    if (!current) preamble.push(line)
    else current.lines.push(line)
  }
  return { preamble, sections }
}

const renderParagraphs = (lines, options = {}) => {
  const { color = COLORS.text, compact = false } = options
  return lines
    .filter(Boolean)
    .map((line, index) => {
      const cta = line.match(/^\[CTA:\s*(.+?)\|(.+?)\]$/)
      if (cta) {
        return `<div style="padding:8px 0 18px;text-align:center;"><a href="${safeUrl(cta[2])}" target="_blank" style="display:inline-block;padding:12px 24px;border:2px solid ${COLORS.blue};border-radius:10px;color:${COLORS.blue};font-family:Arial,Helvetica,sans-serif !important;font-size:14px;line-height:18px;font-weight:700;text-decoration:none;">${escapeHtml(cta[1])}</a></div>`
      }
      const isBullet = /^(📌|✓|⏰|☎|👉|-|•)/.test(line)
      if (isBullet) {
        const marker = line.match(/^(📌|✓|⏰|☎|👉|-|•)/)?.[0] || '•'
        const markerColor = marker === '✓' ? COLORS.lime : COLORS.orange
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr><td valign="top" width="28" style="width:28px;padding:${compact ? 4 : 7}px 0;color:${markerColor};font-family:Arial,Helvetica,sans-serif !important;font-size:16px;line-height:22px;font-weight:700;">${escapeHtml(marker)}</td><td style="padding:${compact ? 4 : 7}px 0;color:${color};font-family:Arial,Helvetica,sans-serif !important;font-size:14px;line-height:22px;">${inlineBold(stripMarkers(line))}</td></tr></table>`
      }
      return `<p style="margin:${index ? 13 : 0}px 0 0;color:${color};font-family:Arial,Helvetica,sans-serif !important;font-size:14px;line-height:23px;">${inlineBold(line)}</p>`
    })
    .join('')
}

const splitSubsections = (lines) => {
  const intro = []
  const groups = []
  let current = null
  for (const line of lines) {
    if (line.startsWith('### ')) {
      current = { title: line.slice(4).trim(), lines: [] }
      groups.push(current)
    } else if (current) current.lines.push(line)
    else intro.push(line)
  }
  return { intro, groups }
}

const renderInfo = (section) => `
  <tr><td style="padding:14px 34px 8px;background:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:${COLORS.pale};border:1px solid #cde4f5;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="padding:17px 22px;background:${COLORS.navy};color:#ffffff;font-family:Arial,Helvetica,sans-serif !important;font-size:19px;line-height:25px;font-weight:700;">${renderHeadingText(section.title)}</td></tr>
      <tr><td style="padding:14px 22px 18px;">${renderParagraphs(section.lines, { compact: true })}</td></tr>
    </table>
  </td></tr>`

const renderBenefits = (section, image) => `
  <tr><td style="padding:26px 34px;background:${COLORS.pale};">
    <div style="margin:0 0 12px;color:${COLORS.navy};font-family:Arial,Helvetica,sans-serif !important;font-size:21px;line-height:28px;font-weight:700;">${renderHeadingText(section.title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr>
      <td valign="middle" style="padding:0 16px 0 0;">${renderParagraphs(section.lines, { compact: true })}</td>
      <td valign="middle" align="center" width="132" style="width:132px;"><img src="${safeUrl(image, '')}" alt="" width="116" style="display:block;width:116px;max-width:100%;height:auto;margin:0 auto;border:0;"></td>
    </tr></table>
  </td></tr>`

const renderOffer = (section) => {
  const { intro, groups } = splitSubsections(section.lines)
  const cards = groups.length
    ? groups.map((group) => `<td class="email-stack" valign="top" width="50%" style="width:50%;padding:6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#ffffff;border:1px solid #ffd2b8;border-radius:12px;font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:16px;"><div style="margin-bottom:10px;color:${COLORS.blue};font-family:Arial,Helvetica,sans-serif !important;font-size:18px;line-height:24px;font-weight:700;">${renderHeadingText(group.title)}</div>${renderParagraphs(group.lines, { compact: true })}</td></tr></table></td>`).join('')
    : `<td style="padding:6px;">${renderParagraphs(intro)}</td>`

  return `<tr><td style="padding:30px 34px;background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#fff8f1;border:1px solid #ffd2b8;border-radius:17px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr><td align="center" style="padding:20px;background:${COLORS.orange};color:#ffffff;font-family:Arial,Helvetica,sans-serif !important;"><div style="font-family:Arial,Helvetica,sans-serif !important;font-size:19px;line-height:27px;font-weight:700;">${renderHeadingText(section.title)}</div>${intro.filter(Boolean).map((line) => `<div style="margin-top:6px;font-family:Arial,Helvetica,sans-serif !important;font-size:14px;line-height:22px;font-weight:700;">${inlineBold(line)}</div>`).join('')}</td></tr><tr><td style="padding:14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr>${cards}</tr></table></td></tr></table></td></tr>`
}

const renderRegistration = (section, mascot) => `
  <tr><td style="padding:0 34px 28px;background:#ffffff;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:${COLORS.pale};border:1px solid #d4e9f8;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr>
    <td valign="middle" style="padding:23px 10px 23px 24px;"><div style="color:${COLORS.navy};font-family:Arial,Helvetica,sans-serif !important;font-size:22px;line-height:28px;font-weight:700;">${renderHeadingText(section.title)}</div><div style="margin-top:10px;">${renderParagraphs(section.lines)}</div></td>
    <td valign="bottom" align="center" width="150" style="width:150px;padding:10px 12px 0 0;"><img src="${safeUrl(mascot, '')}" alt="" width="138" style="display:block;width:138px;max-width:100%;height:auto;margin:0 auto;border:0;"></td>
  </tr></table></td></tr>`

const renderGeneric = (section) => `<tr><td style="padding:25px 34px;background:#ffffff;"><div style="margin-bottom:12px;color:${COLORS.navy};font-family:Arial,Helvetica,sans-serif !important;font-size:20px;line-height:27px;font-weight:700;">${renderHeadingText(section.title)}</div>${renderParagraphs(section.lines)}</td></tr>`

export function buildEmail(content, images) {
  const { preamble, sections } = parseDocument(content)
  const allLines = sections.flatMap((section) => section.lines).filter(Boolean)
  const closingLine = allLines.find((line) => line.toLocaleLowerCase('vi').startsWith('đăng ký ngay hôm nay')) || 'Đăng ký ngay hôm nay, để con tự tin chinh phục thế giới bằng tiếng Anh'
  const signOff = allLines.find((line) => line.toLocaleLowerCase('vi').startsWith('trân trọng')) || 'Trân trọng,'
  const cleanedSections = sections.map((section) => ({
    ...section,
    lines: section.lines.filter((line) => line !== closingLine && line !== signOff),
  }))
  const body = cleanedSections.map((section) => {
    const normalized = section.title.toLocaleUpperCase('vi')
    if (normalized.includes('THÔNG TIN')) return renderInfo(section)
    if (normalized.includes('ĐỊNH HƯỚNG')) return renderBenefits(section, images.benefit)
    if (normalized.includes('ƯU ĐÃI')) return renderOffer(section)
    if (normalized.includes('ĐĂNG KÝ')) return renderRegistration(section, images.mascot)
    return renderGeneric(section)
  }).join('')

  const fragment = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0;padding:0;background:#eef7fc;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;"><tr><td align="center" style="padding:20px 8px;"><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border-collapse:separate;border-spacing:0;border-radius:22px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;"><tr><td style="padding:0;font-size:0;line-height:0;"><img src="${safeUrl(images.banner, '')}" alt="iLEAD" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr><tr><td style="padding:27px 34px;background:#ffffff;color:${COLORS.text};font-family:Arial,Helvetica,sans-serif !important;">${renderParagraphs(preamble)}</td></tr>${body}<tr><td align="center" style="padding:25px 34px;background:${COLORS.navy};color:#ffffff;font-family:Arial,Helvetica,sans-serif !important;"><div style="font-family:Arial,Helvetica,sans-serif !important;font-size:19px;line-height:28px;font-weight:700;">${escapeHtml(closingLine)}</div><div style="margin-top:13px;font-family:Arial,Helvetica,sans-serif !important;font-size:14px;line-height:22px;">${escapeHtml(signOff)}</div></td></tr></table></td></tr></table>`

  const document = `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>iLEAD Email</title><style>body,table,tbody,tr,td,div,p,a,span,strong{font-family:Arial,Helvetica,sans-serif!important}@media only screen and (max-width:640px){table[width="640"]{width:100%!important}.email-stack{display:block!important;width:100%!important}}</style></head><body style="margin:0;padding:0;background:#eef7fc;font-family:Arial,Helvetica,sans-serif;">${fragment}</body></html>`

  return { fragment, document, plainText: content }
}
