import { parseCta } from '../emailTemplate.js'
import { BRAND_COLORS } from '../model/defaults.js'
import { escapeHtml } from '../render/helpers.js'

const MARKER_REGEX = /^([📌✓⏰☎👉•\-])\s*/

function inlineBold(value = '') {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function parseLinesToBlocks(lines, baseId = 'sub') {
  const blocks = []
  let currentList = null
  let currentParagraphs = []

  function flushParagraphs() {
    if (currentParagraphs.length) {
      const html = currentParagraphs.map(line => `<p>${inlineBold(line)}</p>`).join('')
      blocks.push({
        id: `${baseId}-text-${blocks.length}`,
        type: 'text',
        props: { html },
        style: { paddingTop: 0, paddingBottom: 6, paddingX: 0, align: 'justify' },
      })
      currentParagraphs = []
    }
  }

  function flushList() {
    if (currentList && currentList.items.length) {
      blocks.push({
        id: `${baseId}-list-${blocks.length}`,
        type: 'list',
        props: {
          items: currentList.items,
          marker: currentList.marker,
          markerColor: currentList.markerColor,
        },
        style: { paddingTop: 0, paddingBottom: 6, paddingX: 0 },
      })
      currentList = null
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const cta = parseCta(line)
    if (cta) {
      flushParagraphs()
      flushList()
      blocks.push({
        id: `${baseId}-btn-${blocks.length}`,
        type: 'button',
        props: {
          label: cta.label,
          url: cta.url,
          align: cta.align,
          variant: 'outline',
          color: BRAND_COLORS.blue,
        },
        style: { paddingTop: 8, paddingBottom: 16, paddingX: 0 },
      })
      continue
    }

    const markerMatch = line.match(MARKER_REGEX)
    if (markerMatch) {
      flushParagraphs()
      const marker = markerMatch[1]
      const textWithoutMarker = line.slice(markerMatch[0].length).trim()
      const markerColor = marker === '✓' ? BRAND_COLORS.lime : BRAND_COLORS.orange

      if (currentList && currentList.marker === marker) {
        currentList.items.push({ html: inlineBold(textWithoutMarker) })
      } else {
        flushList()
        currentList = {
          marker,
          markerColor,
          items: [{ html: inlineBold(textWithoutMarker) }],
        }
      }
      continue
    }

    // Dòng văn bản bình thường
    flushList()
    currentParagraphs.push(line)
  }

  flushParagraphs()
  flushList()
  return blocks
}

/**
 * Tách một section thành intro và các nhóm ### sub-sections
 */
function splitSubsections(lines) {
  const intro = []
  const groups = []
  let current = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('### ')) {
      current = { title: line.slice(4).trim(), lines: [] }
      groups.push(current)
      continue
    }
    if (!current) intro.push(line)
    else current.lines.push(line)
  }
  return { intro, groups }
}

/**
 * Parser nhập văn bản Phase 1 (chỉ hỗ trợ cú pháp cũ).
 * Cú pháp: ##, ###, marker 📌✓⏰☎👉-•, **bold**, [CTA: label|url|align].
 * Sinh ID ổn định (deterministic).
 *
 * @param {string} source
 * @param {Object} [images]
 * @returns {import('../model/types.js').Block[]}
 */
export function importTextToBlocks(source = '', images = {}) {
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
    if (!current) {
      if (line) preamble.push(line)
    } else {
      current.lines.push(line)
    }
  }

  // Tách dòng closing và signOff
  const allSectionLines = sections.flatMap(s => s.lines).filter(Boolean)
  const closingLine = allSectionLines.find(l => l.toLocaleLowerCase('vi').startsWith('đăng ký ngay hôm nay')) || 'Đăng ký ngay hôm nay, để con tự tin chinh phục thế giới bằng tiếng Anh'
  const signOff = allSectionLines.find(l => l.toLocaleLowerCase('vi').startsWith('trân trọng')) || 'Trân trọng,'

  const blocks = []
  let blockCounter = 1

  // 1. Banner block nếu có ảnh banner
  if (images.banner) {
    blocks.push({
      id: `block-banner`,
      type: 'image',
      props: {
        src: images.banner,
        alt: 'iLEAD',
        width: 'full',
        align: 'center',
        radius: 0,
      },
      style: { paddingTop: 0, paddingBottom: 0, paddingX: 0 },
    })
  }

  // 2. Preamble block
  if (preamble.length) {
    blocks.push({
      id: `block-preamble`,
      type: 'text',
      props: {
        html: preamble.map(l => `<p>${inlineBold(l)}</p>`).join(''),
      },
      style: { paddingTop: 27, paddingBottom: 15, paddingX: 34, align: 'justify' },
    })
  }

  // 3. Sections
  for (const section of sections) {
    const cleanedLines = section.lines.filter(l => l !== closingLine && l !== signOff)
    const normalized = section.title.toLocaleUpperCase('vi')
    const id = `block-${blockCounter++}`

    if (normalized.includes('THÔNG TIN')) {
      blocks.push({
        id,
        type: 'infoCard',
        props: {
          title: section.title,
          headerBg: BRAND_COLORS.navy,
          headerColor: '#ffffff',
          bodyBlocks: parseLinesToBlocks(cleanedLines, `${id}-inner`),
        },
        style: { paddingTop: 0, paddingBottom: 28, paddingX: 34 },
      })
    } else if (normalized.includes('ĐỊNH HƯỚNG')) {
      blocks.push({
        id,
        type: 'imageText',
        props: {
          imagePosition: 'right',
          imageWidth: 132,
          src: images.benefit || '',
          alt: 'Minh họa lợi ích',
          contentBlocks: [
            {
              id: `${id}-heading`,
              type: 'heading',
              props: { html: section.title, level: 2, color: BRAND_COLORS.navy, fontSize: 21 },
              style: { paddingTop: 0, paddingBottom: 12, paddingX: 0 },
            },
            ...parseLinesToBlocks(cleanedLines, `${id}-inner`),
          ],
        },
        style: { paddingTop: 26, paddingBottom: 28, paddingX: 34, bg: BRAND_COLORS.pale },
      })
    } else if (normalized.includes('ƯU ĐÃI')) {
      const { intro, groups } = splitSubsections(cleanedLines)
      const introCta = intro.map(parseCta).find(Boolean)
      const introSubtitle = intro.filter(l => !parseCta(l)).join(' ')

      const cards = groups.map((g, idx) => ({
        title: g.title,
        contentBlocks: parseLinesToBlocks(g.lines, `${id}-card-${idx}`),
      }))

      blocks.push({
        id,
        type: 'offerCards',
        props: {
          title: section.title,
          subtitle: introSubtitle,
          cards,
          columns: 2,
        },
        style: { paddingTop: 30, paddingBottom: 34, paddingX: 34 },
      })

      if (introCta) {
        blocks.push({
          id: `${id}-cta`,
          type: 'button',
          props: {
            label: introCta.label,
            url: introCta.url,
            align: introCta.align,
            variant: 'outline',
            color: BRAND_COLORS.blue,
          },
          style: { paddingTop: 8, paddingBottom: 18, paddingX: 34 },
        })
      }
    } else if (normalized.includes('ĐĂNG KÝ')) {
      const ctas = cleanedLines.map(parseCta).filter(Boolean)
      const bodyLines = cleanedLines.filter(l => !parseCta(l))

      blocks.push({
        id,
        type: 'imageText',
        props: {
          imagePosition: 'right',
          imageWidth: 150,
          src: images.mascot || '',
          alt: 'Mascot iSSACC',
          boxed: true,
          contentBlocks: [
            {
              id: `${id}-heading`,
              type: 'heading',
              props: { html: section.title, level: 1, color: BRAND_COLORS.navy, fontSize: 22 },
              style: { paddingTop: 0, paddingBottom: 10, paddingX: 0 },
            },
            ...parseLinesToBlocks(bodyLines, `${id}-inner`),
            ...ctas.map((cta, idx) => ({
              id: `${id}-cta-${idx}`,
              type: 'button',
              props: {
                label: cta.label,
                url: cta.url,
                align: cta.align,
                variant: 'outline',
                color: BRAND_COLORS.blue,
              },
              style: { paddingTop: 8, paddingBottom: 12, paddingX: 0 },
            })),
          ],
        },
        style: { paddingTop: 0, paddingBottom: 28, paddingX: 34 },
      })
    } else {
      // Generic section
      blocks.push({
        id: `${id}-heading`,
        type: 'heading',
        props: { html: section.title, level: 2, color: BRAND_COLORS.navy, fontSize: 20 },
        style: { paddingTop: 25, paddingBottom: 12, paddingX: 34 },
      })
      blocks.push(...parseLinesToBlocks(cleanedLines, `${id}-inner`))
    }
  }

  // 4. Footer block
  blocks.push({
    id: `block-footer`,
    type: 'footer',
    props: {
      closingLine,
      signOff,
      bg: BRAND_COLORS.navy,
      color: '#ffffff',
    },
    style: { paddingTop: 25, paddingBottom: 34, paddingX: 34, align: 'center' },
  })

  return blocks
}
