/**
 * @typedef {'Arial, Helvetica, sans-serif' | 'Tahoma, Geneva, sans-serif' | 'Verdana, Geneva, sans-serif' | '\'Trebuchet MS\', Helvetica, sans-serif' | 'Georgia, \'Times New Roman\', serif' | '\'Times New Roman\', Times, serif'} SafeFontStack
 *
 * @typedef {Object} EmailPalette
 * @property {string} navy
 * @property {string} blue
 * @property {string} orange
 * @property {string} lime
 * @property {string} text
 * @property {string} pale
 *
 * @typedef {Object} EmailSettings
 * @property {number} width
 * @property {string} outerBg
 * @property {string} contentBg
 * @property {SafeFontStack} fontFamily
 * @property {number} baseFontSize
 * @property {string} textColor
 * @property {number} radius
 * @property {EmailPalette} palette
 *
 * @typedef {'image' | 'heading' | 'text' | 'list' | 'infoCard' | 'imageText' | 'offerCards' | 'button' | 'payment' | 'divider' | 'spacer' | 'footer'} BlockType
 *
 * @typedef {Object} BlockStyle
 * @property {string} [bg]
 * @property {number} [paddingTop]
 * @property {number} [paddingBottom]
 * @property {number} [paddingX]
 * @property {'left' | 'center' | 'right' | 'justify'} [align]
 * @property {boolean} [hidden]
 *
 * @typedef {Object} BlockBase
 * @property {string} id
 * @property {BlockType} type
 * @property {BlockStyle} [style]
 *
 * @typedef {BlockBase & {
 *   type: 'image',
 *   props: {
 *     src: string,
 *     alt: string,
 *     width?: number | 'full',
 *     align?: 'left' | 'center' | 'right',
 *     link?: string,
 *     radius?: number,
 *     caption?: string
 *   }
 * }} ImageBlock
 *
 * @typedef {BlockBase & {
 *   type: 'heading',
 *   props: {
 *     html: string,
 *     level: 1 | 2 | 3,
 *     color?: string,
 *     fontSize?: number
 *   }
 * }} HeadingBlock
 *
 * @typedef {BlockBase & {
 *   type: 'text',
 *   props: {
 *     html: string
 *   }
 * }} TextBlock
 *
 * @typedef {BlockBase & {
 *   type: 'list',
 *   props: {
 *     items: { html: string }[],
 *     marker?: '📌' | '✓' | '•' | '⏰' | '☎' | '👉' | string,
 *     markerColor?: string
 *   }
 * }} ListBlock
 *
 * @typedef {BlockBase & {
 *   type: 'infoCard',
 *   props: {
 *     title: string,
 *     headerBg?: string,
 *     headerColor?: string,
 *     bodyBlocks: (TextBlock | ListBlock | ButtonBlock)[]
 *   }
 * }} InfoCardBlock
 *
 * @typedef {BlockBase & {
 *   type: 'imageText',
 *   props: {
 *     imagePosition: 'left' | 'right',
 *     imageWidth?: number,
 *     src: string,
 *     alt: string,
 *     contentBlocks: (TextBlock | ListBlock | ButtonBlock)[]
 *   }
 * }} ImageTextBlock
 *
 * @typedef {BlockBase & {
 *   type: 'offerCards',
 *   props: {
 *     title: string,
 *     subtitle?: string,
 *     cards: { title: string, contentBlocks: (TextBlock | ListBlock | ButtonBlock)[] }[],
 *     columns?: 1 | 2
 *   }
 * }} OfferCardsBlock
 *
 * @typedef {BlockBase & {
 *   type: 'button',
 *   props: {
 *     label: string,
 *     url: string,
 *     align?: 'left' | 'center' | 'right',
 *     variant?: 'outline' | 'solid',
 *     color?: string,
 *     fullWidth?: boolean
 *   }
 * }} ButtonBlock
 *
 * @typedef {BlockBase & {
 *   type: 'payment',
 *   props: {
 *     title: string,
 *     bankName: string,
 *     accountNo: string,
 *     accountName: string,
 *     amount?: number,
 *     transferContent: string,
 *     qrImageUrl?: string,
 *     qrSize?: number,
 *     layout?: 'qr-left' | 'qr-right' | 'qr-top',
 *     note?: string,
 *     accentColor?: string
 *   }
 * }} PaymentBlock
 *
 * @typedef {BlockBase & {
 *   type: 'divider',
 *   props: {
 *     color?: string,
 *     thickness?: number,
 *     widthPercent?: number
 *   }
 * }} DividerBlock
 *
 * @typedef {BlockBase & {
 *   type: 'spacer',
 *   props: {
 *     height: number
 *   }
 * }} SpacerBlock
 *
 * @typedef {BlockBase & {
 *   type: 'footer',
 *   props: {
 *     html: string,
 *     bg?: string,
 *     color?: string
 *   }
 * }} FooterBlock
 *
 * @typedef {ImageBlock | HeadingBlock | TextBlock | ListBlock | InfoCardBlock | ImageTextBlock | OfferCardsBlock | ButtonBlock | PaymentBlock | DividerBlock | SpacerBlock | FooterBlock} Block
 *
 * @typedef {Object} EmailDoc
 * @property {2} version
 * @property {EmailSettings} settings
 * @property {Block[]} blocks
 */

export {}
