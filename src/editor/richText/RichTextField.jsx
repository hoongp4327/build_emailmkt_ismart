import React, { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { Extension } from '@tiptap/core'
import { cleanPastedHTML } from './pasteFilter.js'
import { useActiveEditor } from './ActiveEditorContext.jsx'

// Extension chặn Enter và Shift-Enter cho chế độ 1 dòng
const SingleLineKeymap = Extension.create({
  name: 'singleLineKeymap',
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
      'Shift-Enter': () => true,
    }
  },
})

/**
 * Component RichTextField dùng TipTap v3.
 *
 * Ràng buộc:
 * 1. Thay đổi từ bên ngoài (undo/redo, load mẫu, chọn block khác) LUÔN gọi setContent(value, { emitUpdate: false }),
 *    kể cả khi editor đang focus.
 * 2. Nếu đang IME composition (Telex/Unikey) thì hoãn đến compositionend mới áp dụng.
 * 3. Sau setContent khi đang focus: giữ selection gần vị trí cũ nhất có thể (clamp theo độ dài doc).
 * 4. Thay đổi do chính editor tạo ra (onUpdate) không bao giờ kích hoạt setContent ngược lại (dùng lastEmittedValueRef).
 * 5. Toolbar dùng chung: đăng ký activeEditor với ActiveEditorContext khi focus.
 *
 * @param {Object} props
 * @param {string} props.value - HTML hiện tại
 * @param {Function} props.onChange - Hàm callback (newHtml) => void
 * @param {boolean} [props.singleLine=false] - Chế độ 1 dòng (chặn Enter, nối đoạn khi dán)
 * @param {string} [props.placeholder='Nhập nội dung...']
 * @param {string} [props.className='']
 */
export function RichTextField({
  value = '',
  onChange,
  singleLine = false,
  placeholder = 'Nhập nội dung...',
  className = '',
}) {
  const { setActiveEditor, clearActiveEditor } = useActiveEditor()

  const isComposingRef = useRef(false)
  const pendingExternalValueRef = useRef(null)
  const lastEmittedValueRef = useRef(value || '')

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const extensions = [
    StarterKit.configure({
      undoRedo: false, // TẮT undo nội bộ TipTap để app useHistory quản lý duy nhất (Ràng buộc 1 & 6)
      heading: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      blockquote: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      link: {
        openOnClick: false, // Không mở link khi đang sửa trong editor (Ràng buộc 7)
      },
    }),
    TextStyleKit, // Gói chính thức gồm TextStyle, FontSize, LineHeight, Color, FontFamily, BackgroundColor
    TextAlign.configure({
      types: ['paragraph'],
    }),
    Highlight.configure({
      multicolor: true,
    }),
  ]

  if (singleLine) {
    extensions.push(SingleLineKeymap)
  }

  const editor = useEditor({
    extensions,
    content: value || '',
    editorProps: {
      attributes: {
        class: `tiptap-editor ${singleLine ? 'single-line' : 'multi-line'} ${className}`,
        placeholder,
      },
      transformPastedHTML(html) {
        return cleanPastedHTML(html, { singleLine })
      },
      transformPastedText(text) {
        if (singleLine) {
          return text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
        }
        return text
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items || []
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('ismart-toast', {
                  detail: { message: 'Dùng khối Ảnh để chèn ảnh vào email' },
                })
              )
            }
            return true
          }
        }
        return false
      },
    },
    onUpdate({ editor: currentEditor }) {
      const newHtml = currentEditor.getHTML()
      lastEmittedValueRef.current = newHtml
      onChangeRef.current?.(newHtml)
    },
    onFocus({ editor: currentEditor }) {
      setActiveEditor(currentEditor, { isSingleLine: singleLine })
    },
  })

  // Đăng ký IME composition listener trên editor dom element
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const dom = editor.view.dom
    function handleCompositionStart() {
      isComposingRef.current = true
    }
    function handleCompositionEnd() {
      isComposingRef.current = false
      // Nếu có giá trị từ bên ngoài bị hoãn trong lúc đang gõ Telex/Unikey, áp dụng ngay
      if (pendingExternalValueRef.current !== null) {
        const valToSet = pendingExternalValueRef.current
        pendingExternalValueRef.current = null
        applyExternalContent(valToSet)
      }
    }

    dom.addEventListener('compositionstart', handleCompositionStart)
    dom.addEventListener('compositionend', handleCompositionEnd)

    return () => {
      dom.removeEventListener('compositionstart', handleCompositionStart)
      dom.removeEventListener('compositionend', handleCompositionEnd)
    }
  }, [editor])

  // Hàm áp dụng giá trị từ bên ngoài vào editor và bảo toàn vị trí selection
  const applyExternalContent = useCallback(
    (nextVal) => {
      if (!editor || editor.isDestroyed) return

      const prevPos = editor.state.selection.from
      const isFocused = editor.isFocused

      editor.commands.setContent(nextVal || '', { emitUpdate: false })
      lastEmittedValueRef.current = nextVal || ''

      if (isFocused) {
        // Giữ vị trí con trỏ gần vị trí cũ nhất có thể (clamp theo kích thước document mới)
        const docSize = editor.state.doc.content.size
        const safePos = Math.min(Math.max(1, prevPos), docSize)
        editor.commands.setTextSelection(safePos)
      }
    },
    [editor]
  )

  // Đồng bộ giá trị khi prop `value` thay đổi từ bên ngoài (Ràng buộc 1)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    // Nếu giá trị trùng với lần emit gần nhất của chính editor -> không setContent
    if (value === lastEmittedValueRef.current) return

    // Nếu đang trong quá trình gõ tiếng Việt IME -> hoãn đến khi gõ xong cụm từ (compositionend)
    if (isComposingRef.current) {
      pendingExternalValueRef.current = value
      return
    }

    // Áp dụng ngay thay đổi từ bên ngoài (kể cả khi đang focus)
    applyExternalContent(value)
  }, [editor, value, applyExternalContent])

  // Hủy đăng ký active editor khi component unmount
  useEffect(() => {
    return () => {
      if (editor) {
        clearActiveEditor(editor)
      }
    }
  }, [editor, clearActiveEditor])

  return (
    <div className={`rich-text-field-wrapper ${singleLine ? 'is-single-line' : 'is-multi-line'}`}>
      <EditorContent editor={editor} />
    </div>
  )
}
