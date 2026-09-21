import { nanoid } from 'nanoid'

export const BRAND_COLORS = {
  navy: '#082e6f',
  blue: '#0870c5',
  orange: '#ff641c',
  lime: '#80b600',
  text: '#254166',
  pale: '#eef7fc',
}

export const SAFE_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Verdana, Geneva, sans-serif',
  "'Trebuchet MS', Helvetica, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "'Times New Roman', Times, serif",
]

export const DEFAULT_FONT = SAFE_FONTS[0]

export const DEFAULT_SETTINGS = {
  width: 640,
  outerBg: '#eef7fc',
  contentBg: '#ffffff',
  fontFamily: DEFAULT_FONT,
  baseFontSize: 14,
  textColor: BRAND_COLORS.text,
  radius: 22,
  palette: { ...BRAND_COLORS },
}

export const DEFAULT_BLOCK_STYLE = {
  paddingTop: 25,
  paddingBottom: 25,
  paddingX: 34,
  align: 'left',
  hidden: false,
}

const DEFAULT_PROPS_BY_TYPE = {
  image: () => ({
    src: '',
    alt: '',
    width: 'full',
    align: 'center',
    radius: 0,
    caption: '',
    link: '',
  }),
  heading: () => ({
    html: 'Tiêu đề',
    level: 2,
    color: BRAND_COLORS.navy,
    fontSize: 20,
  }),
  text: () => ({
    html: '<p>Nội dung văn bản</p>',
  }),
  list: () => ({
    items: [{ html: 'Mục danh sách' }],
    marker: '📌',
    markerColor: BRAND_COLORS.orange,
  }),
  infoCard: () => ({
    title: 'THÔNG TIN',
    headerBg: BRAND_COLORS.navy,
    headerColor: '#ffffff',
    bodyBlocks: [],
  }),
  imageText: () => ({
    imagePosition: 'right',
    imageWidth: 132,
    src: '',
    alt: '',
    contentBlocks: [],
  }),
  offerCards: () => ({
    title: 'ƯU ĐÃI ĐẶC BIỆT',
    subtitle: '',
    cards: [],
    columns: 2,
  }),
  button: () => ({
    label: 'Tìm hiểu thêm',
    url: 'https://ismart.edu.vn',
    align: 'center',
    variant: 'outline',
    color: BRAND_COLORS.blue,
    fullWidth: false,
  }),
  payment: () => ({
    title: 'THÔNG TIN CHUYỂN KHOẢN',
    bankName: '',
    accountNo: '',
    accountName: '',
    amount: undefined,
    transferContent: '',
    qrImageUrl: '',
    qrSize: 200,
    layout: 'qr-left',
    note: '',
    accentColor: BRAND_COLORS.navy,
  }),
  divider: () => ({
    color: '#d4e9f8',
    thickness: 1,
    widthPercent: 100,
  }),
  spacer: () => ({
    height: 20,
  }),
  footer: () => ({
    html: '<p>Trân trọng,</p>',
    bg: BRAND_COLORS.navy,
    color: '#ffffff',
  }),
}

/**
 * Tạo block mới với id định sẵn hoặc sinh qua nanoid().
 * @param {string} type
 * @param {Record<string, any>} [props]
 * @param {Record<string, any>} [style]
 * @param {string} [id]
 * @returns {import('./types.js').Block}
 */
export function createBlock(type, props = {}, style = {}, id = undefined) {
  const getDefaultProps = DEFAULT_PROPS_BY_TYPE[type]
  if (!getDefaultProps) {
    throw new Error(`Loại block không hỗ trợ: ${type}`)
  }

  return {
    id: id || nanoid(),
    type,
    props: {
      ...getDefaultProps(),
      ...props,
    },
    style: {
      ...DEFAULT_BLOCK_STYLE,
      ...style,
    },
  }
}

/**
 * Khởi tạo một EmailDoc v2 rỗng chuẩn.
 * @param {Partial<import('./types.js').EmailSettings>} [settingsOverrides]
 * @param {import('./types.js').Block[]} [blocks]
 * @returns {import('./types.js').EmailDoc}
 */
export function createDefaultDoc(settingsOverrides = {}, blocks = []) {
  return {
    version: 2,
    settings: {
      ...DEFAULT_SETTINGS,
      ...settingsOverrides,
    },
    blocks,
  }
}
