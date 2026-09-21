import { createDefaultDoc } from './defaults.js'
import { importTextToBlocks } from '../import/textImporter.js'

/**
 * Tự động migrate dữ liệu từ v1 (ismart-email-builder-v1) sang cấu trúc EmailDoc v2.
 * @param {Object} v1Data
 * @param {string} [v1Data.content]
 * @param {Object} [v1Data.images]
 * @returns {import('./types.js').EmailDoc}
 */
export function migrateV1toV2(v1Data = {}) {
  const content = v1Data.content || ''
  const images = v1Data.images || {}
  const blocks = importTextToBlocks(content, images)

  return createDefaultDoc({}, blocks)
}
