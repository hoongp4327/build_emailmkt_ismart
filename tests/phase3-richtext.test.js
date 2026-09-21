import test from 'node:test'
import assert from 'node:assert/strict'
import { Window } from 'happy-dom'

// Cài đặt môi trường DOM thực tế cho TipTap trong Node test runner
const domWindow = new Window()
globalThis.window = domWindow
globalThis.document = domWindow.document
globalThis.Node = domWindow.Node
globalThis.Element = domWindow.Element
globalThis.HTMLElement = domWindow.HTMLElement
globalThis.DocumentFragment = domWindow.DocumentFragment
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)

import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'

import { sanitizeAndInlineRichText } from '../src/render/richText.js'
import { cleanPastedHTML } from '../src/editor/richText/pasteFilter.js'
import { renderEmail } from '../src/render/renderEmail.js'
import ileadOfferDoc from '../src/templates/ilead-offer.json' with { type: 'json' }
import paymentNoticeDoc from '../src/templates/payment-notice.json' with { type: 'json' }

function createTestEditor(content = '', singleLine = false) {
  const element = document.createElement('div')
  document.body.appendChild(element)
  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        undoRedo: false, // Tắt undo nội bộ TipTap
        link: { openOnClick: false },
      }),
      TextStyleKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
    ],
    content,
  })
}

// 1. Test Tắt Undo Nội Bộ TipTap (Ràng buộc 3 & 6)
test('TipTap v3: undoRedo: false thực sự tắt undo nội bộ, không can thiệp phím tắt của App', () => {
  const editor = createTestEditor('<p>Kiểm tra undo</p>')
  // Khi undoRedo: false, command `undo` không được đăng ký trong editor
  assert.equal(typeof editor.commands.undo, 'undefined', 'Command undo nội bộ phải bị tắt hoàn toàn')
  editor.destroy()
})

// 2. Test Idempotent TipTap HTML: nạp -> getHTML -> nạp lại -> getHTML giống nhau (Ràng buộc 2)
test('Idempotent TipTap HTML: html -> TipTap -> getHTML() -> nạp lại -> getHTML() đồng nhất', () => {
  const originalHtml = '<p>Kính gửi <strong>Quý học viên</strong>, iSMART chào mừng bạn!</p>'
  const editor1 = createTestEditor(originalHtml)
  const exportedHtml1 = editor1.getHTML()

  const editor2 = createTestEditor(exportedHtml1)
  const exportedHtml2 = editor2.getHTML()

  assert.equal(exportedHtml1, exportedHtml2, 'Kết quả xuất HTML giữa 2 lần nạp phải giống hệt nhau')
  assert.ok(exportedHtml1.includes('<strong>Quý học viên</strong>'))

  editor1.destroy()
  editor2.destroy()
})

// 3. Test Highlight Chuyển Đổi: <mark data-color="..."> -> <span style="background-color:..."> (Ràng buộc 2 & 4)
test('Highlight: chuyển <mark> và data-color thành <span style="background-color:..."> bỏ padding và border-radius', () => {
  const tipTapMarkHtml = '<p>Khóa học <mark data-color="#ffeb3b" style="background-color: #ffeb3b;">tiếng Trung cơ bản</mark> HSK1.</p>'
  const inlined = sanitizeAndInlineRichText(tipTapMarkHtml, { fontFamily: 'Arial, Helvetica, sans-serif' })

  assert.ok(inlined.includes('<span style="'), 'Phải được chuyển thành thẻ span')
  assert.ok(inlined.includes('background-color:#ffeb3b'), 'Phải giữ thuộc tính background-color')
  assert.ok(!inlined.includes('<mark'), 'Không còn thẻ mark thô')
  assert.ok(!inlined.includes('padding:'), 'Tuyệt đối không có padding theo Ràng buộc 4')
  assert.ok(!inlined.includes('border-radius:'), 'Tuyệt đối không có border-radius theo Ràng buộc 4')
})

// 4. Test Dán Google Docs Thật: không làm đậm cả đoạn (Ràng buộc 4)
test('Dán Google Docs thật: bóc wrapper <b style="font-weight:normal" id="docs-internal-guid-..."> không làm đậm cả đoạn', () => {
  const realGoogleDocsHtml = `<b style="font-weight:normal;" id="docs-internal-guid-5b7e8ff1-7fff-6950-8b1b-2661c944ad78">
    <p dir="ltr"><span style="font-size:11pt;font-family:Arial;color:#000000;font-weight:400;">Đoạn văn bình thường từ Docs. </span>
    <span style="font-size:11pt;font-family:Arial;color:#000000;font-weight:700;">Chữ in đậm.</span></p>
  </b>`

  const cleaned = cleanPastedHTML(realGoogleDocsHtml)

  assert.ok(!cleaned.startsWith('<strong><p>'), 'Đoạn văn không được bị bọc trong thẻ strong')
  assert.ok(!cleaned.includes('docs-internal-guid'), 'Phải bỏ id rác của Google Docs')
  assert.ok(!cleaned.includes('font-family:Arial'), 'Phải bỏ font-family nguồn ngoài')
  assert.ok(!cleaned.includes('font-size:11pt'), 'Phải bỏ font-size nguồn ngoài')
  assert.ok(cleaned.includes('Đoạn văn bình thường từ Docs.'))
  assert.ok(cleaned.includes('<strong>Chữ in đậm.</strong>'), 'Chữ in đậm thật sự phải được giữ lại')
})

// 5. Test Dán Word Thật: bỏ mso-*, màu đen, cỡ pt (Ràng buộc 4)
test('Dán Word thật: bỏ mso-*, color:black, cỡ pt, loại bỏ thẻ <img> dán kèm', () => {
  const realWordHtml = `<p class="MsoNormal" style="mso-margin-top-alt:auto;mso-margin-bottom-alt:auto;line-height:normal">
    <span style="font-size:12.0pt;font-family:&quot;Calibri&quot;,sans-serif;color:black">Đoạn văn Word thường, </span>
    <b><span style="font-size:12.0pt;font-family:&quot;Calibri&quot;,sans-serif;color:black">Word in đậm</span></b>
    <span style="font-size:12.0pt;font-family:&quot;Calibri&quot;,sans-serif;color:black">.</span>
    <img src="https://example.com/unauthorized.png" alt="word-image" />
    <o:p></o:p>
  </p>`

  const cleaned = cleanPastedHTML(realWordHtml)

  assert.ok(!cleaned.includes('class="MsoNormal"'), 'Phải bỏ class MsoNormal')
  assert.ok(!cleaned.includes('mso-margin'), 'Phải bỏ thuộc tính mso')
  assert.ok(!cleaned.includes('Calibri'), 'Phải bỏ font Calibri')
  assert.ok(!cleaned.includes('12.0pt'), 'Phải bỏ cỡ chữ 12.0pt')
  assert.ok(!cleaned.includes('<img'), 'Phải loại bỏ thẻ img dán kèm theo Ràng buộc 4')
  assert.ok(!cleaned.includes('<o:p>'), 'Phải loại bỏ thẻ o:p của Word')
  assert.ok(cleaned.includes('<strong>Word in đậm</strong>'))
})

// 6. Test Copy Nội Bộ TipTap với data-pm-slice (Ràng buộc 3)
test('Copy nội bộ TipTap: có data-pm-slice thì giữ nguyên font, cỡ, màu, nền', () => {
  const internalTipTapHtml = `<p data-pm-slice="1 1 []"><span style="color: #ff641c; font-size: 18px; font-family: 'Trebuchet MS', Helvetica, sans-serif; background-color: #ffe2cc;">Ưu đãi đặc biệt</span></p>`
  const cleaned = cleanPastedHTML(internalTipTapHtml)

  assert.ok(cleaned.includes('color: #ff641c'), 'Copy nội bộ phải giữ lại màu chữ')
  assert.ok(cleaned.includes('font-size: 18px'), 'Copy nội bộ phải giữ lại cỡ chữ')
  assert.ok(cleaned.includes('Trebuchet MS'), 'Copy nội bộ phải giữ lại font chữ')
  assert.ok(cleaned.includes('background-color: #ffe2cc'), 'Copy nội bộ phải giữ lại màu nền')
})

// 7. Test Dán Nhiều Dòng Vào Ô 1 Dòng (Ràng buộc 6)
test('Ô 1 dòng: dán text nhiều dòng tự động nối thành 1 dòng bằng dấu cách', () => {
  const multiLineHtml = '<p>Tiêu đề phần 1</p><p>Tiêu đề phần 2</p><br>Dòng 3'
  const singleLined = cleanPastedHTML(multiLineHtml, { singleLine: true })

  assert.ok(!singleLined.includes('<p>'), 'Không được chứa thẻ <p>')
  assert.ok(!singleLined.includes('</p>'), 'Không được chứa thẻ </p>')
  assert.ok(!singleLined.includes('<br>'), 'Không được chứa thẻ <br>')
  assert.equal(singleLined, 'Tiêu đề phần 1 Tiêu đề phần 2 Dòng 3')
})

// 8. Test Link trong richText.js (Ràng buộc 2 & 7)
test('Link: bỏ font-weight:700 bắt buộc, kế thừa độ đậm; color mặc định #0870c5; có text-decoration:underline', () => {
  const rawHtml = '<p>Tham khảo <a href="https://fahasa.com/book">sách giáo trình</a> tại đây.</p>'
  const inlined = sanitizeAndInlineRichText(rawHtml, { fontFamily: 'Arial, Helvetica, sans-serif' })

  assert.ok(inlined.includes('text-decoration:underline'), 'Link phải có text-decoration:underline')
  assert.ok(inlined.includes('color:#0870c5'), 'Màu mặc định là #0870c5')
  assert.ok(!inlined.includes('font-weight:700'), 'Không ép font-weight:700 bắt buộc trên thẻ a')
  assert.ok(inlined.includes('target="_blank"'), 'Thẻ a có target="_blank"')
})

// 9. Test Inline Style Toàn Diện Chống Gmail Reset (Ràng buộc 4)
test('Inline Style: mọi thẻ con (strong, em, u, s, span, a) đều có font-family để Gmail không reset', () => {
  const rawHtml = '<p>Xin chào <strong>iSMART</strong>, <em>Equest</em> và <span style="font-size:16px;">CBNV</span>.</p>'
  const inlined = sanitizeAndInlineRichText(rawHtml, { fontFamily: 'Verdana, Geneva, sans-serif' })

  assert.ok(inlined.includes('<strong style="font-weight:700;font-family:Verdana, Geneva, sans-serif;">iSMART</strong>'))
  assert.ok(inlined.includes('<em style="font-style:italic;font-family:Verdana, Geneva, sans-serif;">Equest</em>'))
  assert.ok(inlined.includes('<span style="font-size:16px;font-family:Verdana, Geneva, sans-serif;">CBNV</span>'))
})

// 10. Test Tương Thích Mẫu Cũ: nạp ilead-offer.json & payment-notice.json qua TipTap (Ràng buộc 2)
test('Tương thích ngược: Mẫu email cũ nạp qua TipTap và render HTML giữ nguyên vẹn nội dung và cấu trúc', () => {
  // Test với text block của ileadOfferDoc
  const textBlock = ileadOfferDoc.blocks.find((b) => b.type === 'text')
  assert.ok(textBlock, 'Phải tìm thấy text block trong ileadOfferDoc')

  const editor = createTestEditor(textBlock.props.html)
  const tipTapHtml = editor.getHTML()

  // TipTap xuất ra HTML sạch
  assert.ok(tipTapHtml.includes('Kính gửi toàn thể Anh/Chị CBNV'))
  assert.ok(tipTapHtml.includes('iLEAD'))

  // Render email với HTML TipTap
  const updatedDoc = {
    ...ileadOfferDoc,
    blocks: ileadOfferDoc.blocks.map((b) => (b.id === textBlock.id ? { ...b, props: { ...b.props, html: tipTapHtml } } : b)),
  }
  const rendered = renderEmail(updatedDoc)
  assert.ok(rendered.document.includes('Kính gửi toàn thể Anh/Chị CBNV'))
  assert.ok(rendered.document.includes('margin:0 0 12px'))

  editor.destroy()
})

// 11. Test Editor Focus + Gõ -> App Undo (Ràng buộc 1)
test('Editor Focus + Gõ -> App Undo: setContent nhận giá trị cũ từ bên ngoài và cập nhật chuẩn xác', async () => {
  const initialHtml = '<p>Trạng thái ban đầu</p>'
  const editor = createTestEditor(initialHtml)

  // Giả lập editor đang focus
  editor.view.focus()
  await new Promise((r) => setTimeout(r, 10))
  // Kiểm tra hoặc gán focus state trong môi trường headless
  if (!editor.isFocused) {
    editor.view.dom.focus()
  }

  // Người dùng gõ thêm chữ
  editor.commands.insertContent(' - thêm nội dung mới')
  const editedHtml = editor.getHTML()
  assert.ok(editedHtml.includes('thêm nội dung mới'))

  // Giả lập App Undo kích hoạt: setContent đưa về initialHtml với emitUpdate: false
  editor.commands.setContent(initialHtml, { emitUpdate: false })

  // Nội dung editor phải được khôi phục chính xác về trạng thái ban đầu
  assert.equal(editor.getHTML(), initialHtml)

  // Con trỏ vẫn hợp lệ và có thể gõ tiếp
  editor.commands.insertContent(' - gõ tiếp sau undo')
  assert.equal(editor.getHTML(), '<p>Trạng thái ban đầu - gõ tiếp sau undo</p>')

  editor.destroy()
})
