/**
 * Render khối khoảng trống chiều cao linh hoạt (spacer).
 *
 * @param {import('../../model/types.js').SpacerBlock} block
 * @returns {string}
 */
export function renderSpacerBlock(block) {
  const { props = {}, style = {} } = block
  const height = Math.max(4, Number(props.height) || 20)
  const bg = style.bg || 'transparent'

  return `<tr><td height="${height}" style="height:${height}px;padding:0;background:${bg};font-size:0;line-height:0;">&nbsp;</td></tr>`
}
