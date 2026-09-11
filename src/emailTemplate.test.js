import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildEmail, parseCta } from './emailTemplate.js'
import { DEFAULT_IMAGES } from './defaultContent.js'

test('CTA cũ mặc định căn giữa; ba hướng căn được nhận đúng', () => {
  assert.equal(parseCta('[CTA: Chi tiết|https://example.com/]').align, 'center')
  for (const align of ['left', 'center', 'right']) {
    const line = `[CTA: Đăng ký|https://example.com/|${align}]`
    assert.equal(parseCta(line).align, align)
    const { fragment } = buildEmail(`Xin chào\n## ĐĂNG KÝ THAM GIA\nNội dung thử nghiệm\n${line}`, DEFAULT_IMAGES)
    assert.match(fragment, /text-align:justify/)
    const fullRow = fragment.slice(fragment.indexOf('colspan="2"'))
    assert.ok(fullRow.includes(`text-align:${align}`))
    assert.equal((fragment.match(/>Đăng ký<\/a>/g) || []).length, 1)
  }
})

test('CTA nằm ở hàng riêng sau ảnh; nhiều nút vẫn giữ thứ tự', () => {
  const { fragment } = buildEmail('## ĐĂNG KÝ THAM GIA\nNội dung\n[CTA: Một|https://example.com/|left]\n[CTA: Hai|https://example.com/|right]', DEFAULT_IMAGES)
  assert.ok(fragment.indexOf('colspan="2"') > fragment.indexOf(DEFAULT_IMAGES.mascot))
  assert.ok(fragment.indexOf('>Một</a>') < fragment.indexOf('>Hai</a>'))
})

test('căn đều áp dụng cho đoạn và bullet trong cả HTML tải về và clipboard', () => {
  const output = buildEmail('Đoạn văn\n✓ Nội dung', DEFAULT_IMAGES)
  for (const html of [output.fragment, output.document]) {
    assert.match(html, /<p style="[^"]*text-align:justify/)
    assert.match(html, /<td style="[^"]*text-align:justify/)
  }
})
