import React, { useState, useRef, useEffect } from 'react'
import { useActiveEditor } from './ActiveEditorContext.jsx'
import { SAFE_FONTS, BRAND_COLORS } from '../../model/defaults.js'
import { safeUrl } from '../../render/helpers.js'

const FONT_OPTIONS = [
  { label: 'Arial', value: SAFE_FONTS[0] },
  { label: 'Tahoma', value: SAFE_FONTS[1] },
  { label: 'Verdana', value: SAFE_FONTS[2] },
  { label: 'Trebuchet MS', value: SAFE_FONTS[3] },
  { label: 'Georgia', value: SAFE_FONTS[4] },
  { label: 'Times New Roman', value: SAFE_FONTS[5] },
]

const FONT_SIZES = [12, 13, 14, 16, 18, 20, 22, 24, 28, 32]
const LINE_HEIGHTS = ['1.4', '1.6', '1.8']
const QUICK_EMOJIS = ['📌', '✓', '⏰', '☎', '👉', '🎯', '💰', '🎁', '📅']

const COLOR_PALETTE = [
  { label: 'Navy', value: BRAND_COLORS.navy },
  { label: 'Blue', value: BRAND_COLORS.blue },
  { label: 'Orange', value: BRAND_COLORS.orange },
  { label: 'Lime', value: BRAND_COLORS.lime },
  { label: 'Text', value: BRAND_COLORS.text },
  { label: 'Đen', value: '#111827' },
  { label: 'Trắng', value: '#ffffff' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Vàng', value: '#fff2a8' },
  { label: 'Cam nhạt', value: '#ffe2cc' },
  { label: 'Xanh nhạt', value: '#d4e9f8' },
  { label: 'Xanh lá', value: '#e2f6cb' },
]

/**
 * Thanh công cụ RichText dùng chung, dính ở đầu Inspector (Ràng buộc 5).
 * Điều khiển editor đang focus, tự ẩn nút không áp dụng cho ô 1 dòng.
 */
export function RichTextToolbar() {
  const { activeEditor, isSingleLine } = useActiveEditor()

  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false)
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false)
  const [hexInput, setHexInput] = useState('')

  const colorRef = useRef(null)
  const highlightRef = useRef(null)
  const emojiRef = useRef(null)

  // Đóng popover khi click ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (colorRef.current && !colorRef.current.contains(e.target)) setColorMenuOpen(false)
      if (highlightRef.current && !highlightRef.current.contains(e.target)) setHighlightMenuOpen(false)
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!activeEditor || activeEditor.isDestroyed) {
    return (
      <div className="sticky-richtext-toolbar is-empty" aria-label="Thanh công cụ định dạng chữ">
        <span className="toolbar-hint">Nhấp vào ô văn bản để định dạng chữ</span>
      </div>
    )
  }

  // Đọc trạng thái định dạng hiện tại từ activeEditor
  const isBold = activeEditor.isActive('bold')
  const isItalic = activeEditor.isActive('italic')
  const isUnderline = activeEditor.isActive('underline')
  const isStrike = activeEditor.isActive('strike')
  const isLink = activeEditor.isActive('link')
  const isHighlight = activeEditor.isActive('highlight')

  const currentFontFamily = activeEditor.getAttributes('textStyle').fontFamily || ''
  const currentFontSize = activeEditor.getAttributes('textStyle').fontSize || ''
  const currentLineHeight = activeEditor.getAttributes('textStyle').lineHeight || '1.6'
  const currentColor = activeEditor.getAttributes('textStyle').color || ''

  // Thao tác chèn link
  function handleToggleLink() {
    if (isLink) {
      activeEditor.chain().focus().unsetLink().run()
      return
    }
    const currentHref = activeEditor.getAttributes('link').href || ''
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', currentHref || 'https://')
    if (url) {
      const safe = safeUrl(url, '#')
      activeEditor.chain().focus().setLink({ href: safe }).run()
    }
  }

  return (
    <div className="sticky-richtext-toolbar" role="toolbar" aria-label="Định dạng văn bản">
      {/* 1. Font Family Dropdown */}
      <select
        className="toolbar-select font-select"
        value={currentFontFamily}
        onChange={(e) => {
          const val = e.target.value
          if (val) activeEditor.chain().focus().setFontFamily(val).run()
          else activeEditor.chain().focus().unsetFontFamily().run()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Phông chữ (6 phông chuẩn email)"
      >
        <option value="">Phông mặc định</option>
        {FONT_OPTIONS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* 2. Cỡ chữ Dropdown */}
      <select
        className="toolbar-select size-select"
        value={currentFontSize.replace('px', '')}
        onChange={(e) => {
          const val = e.target.value
          if (val) activeEditor.chain().focus().setFontSize(`${val}px`).run()
          else activeEditor.chain().focus().unsetFontSize().run()
        }}
        onMouseDown={(e) => e.stopPropagation()}
        title="Cỡ chữ (12px - 32px)"
      >
        <option value="">Cỡ</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}px
          </option>
        ))}
      </select>

      <div className="toolbar-divider" />

      {/* 3. Đậm (400 / 700) */}
      <button
        type="button"
        className={`toolbar-btn ${isBold ? 'active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault()
          activeEditor.chain().focus().toggleBold().run()
        }}
        title="Đậm (Độ đậm 700. Lưu ý: Font hệ thống email chỉ render ổn 400 và 700)"
      >
        <strong>B</strong>
      </button>

      {/* 4. Nghiêng */}
      <button
        type="button"
        className={`toolbar-btn ${isItalic ? 'active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault()
          activeEditor.chain().focus().toggleItalic().run()
        }}
        title="Nghiêng"
      >
        <em>I</em>
      </button>

      {/* 5. Gạch chân */}
      <button
        type="button"
        className={`toolbar-btn ${isUnderline ? 'active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault()
          activeEditor.chain().focus().toggleUnderline().run()
        }}
        title="Gạch chân"
      >
        <u>U</u>
      </button>

      {/* 6. Gạch ngang */}
      <button
        type="button"
        className={`toolbar-btn ${isStrike ? 'active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault()
          activeEditor.chain().focus().toggleStrike().run()
        }}
        title="Gạch ngang"
      >
        <s>S</s>
      </button>

      <div className="toolbar-divider" />

      {/* 7. Màu chữ (Color) */}
      <div className="toolbar-popover-wrapper" ref={colorRef}>
        <button
          type="button"
          className="toolbar-btn color-btn"
          onMouseDown={(e) => {
            e.preventDefault()
            setColorMenuOpen((prev) => !prev)
          }}
          title="Màu chữ"
        >
          <span className="color-indicator" style={{ backgroundColor: currentColor || BRAND_COLORS.text }} />
          <span>A</span>
        </button>

        {colorMenuOpen && (
          <div className="toolbar-popover color-popover">
            <div className="popover-title">Màu thương hiệu iSMART</div>
            <div className="palette-grid">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="palette-swatch"
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    activeEditor.chain().focus().setColor(c.value).run()
                    setColorMenuOpen(false)
                  }}
                />
              ))}
            </div>
            <div className="hex-row">
              <input
                type="text"
                placeholder="#082e6f"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                maxLength={7}
                className="hex-input"
              />
              <button
                type="button"
                className="hex-apply-btn"
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hexInput)) {
                    activeEditor.chain().focus().setColor(hexInput).run()
                    setColorMenuOpen(false)
                    setHexInput('')
                  }
                }}
              >
                Áp dụng
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 8. Tô nền chữ (Highlight) */}
      <div className="toolbar-popover-wrapper" ref={highlightRef}>
        <button
          type="button"
          className={`toolbar-btn highlight-btn ${isHighlight ? 'active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            setHighlightMenuOpen((prev) => !prev)
          }}
          title="Tô màu nền chữ"
        >
          <span>🖊</span>
        </button>

        {highlightMenuOpen && (
          <div className="toolbar-popover highlight-popover">
            <div className="popover-title">Màu nền highlight</div>
            <div className="palette-grid">
              {HIGHLIGHT_COLORS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  className="palette-swatch"
                  style={{ backgroundColor: h.value }}
                  title={h.label}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    activeEditor.chain().focus().setHighlight({ color: h.value }).run()
                    setHighlightMenuOpen(false)
                  }}
                />
              ))}
              <button
                type="button"
                className="palette-clear-btn"
                onMouseDown={(e) => {
                  e.preventDefault()
                  activeEditor.chain().focus().unsetHighlight().run()
                  setHighlightMenuOpen(false)
                }}
                title="Bỏ tô màu nền"
              >
                ✕ Bỏ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 9. Giãn dòng (Line-height) - ẨN KHI LÀ Ô 1 DÒNG (Ràng buộc 5) */}
      {!isSingleLine && (
        <select
          className="toolbar-select lh-select"
          value={currentLineHeight}
          onChange={(e) => {
            const val = e.target.value
            if (val) activeEditor.chain().focus().setLineHeight(val).run()
            else activeEditor.chain().focus().unsetLineHeight().run()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Giãn dòng (1.4 / 1.6 / 1.8)"
        >
          {LINE_HEIGHTS.map((lh) => (
            <option key={lh} value={lh}>
              ↕ {lh}
            </option>
          ))}
        </select>
      )}

      {/* 10. Căn lề - ẨN KHI LÀ Ô 1 DÒNG (Ràng buộc 5) */}
      {!isSingleLine && (
        <>
          <div className="toolbar-divider" />
          <button
            type="button"
            className={`toolbar-btn ${activeEditor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault()
              activeEditor.chain().focus().setTextAlign('left').run()
            }}
            title="Căn trái"
          >
            ≡
          </button>
          <button
            type="button"
            className={`toolbar-btn ${activeEditor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault()
              activeEditor.chain().focus().setTextAlign('center').run()
            }}
            title="Căn giữa"
          >
            ≍
          </button>
          <button
            type="button"
            className={`toolbar-btn ${activeEditor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault()
              activeEditor.chain().focus().setTextAlign('right').run()
            }}
            title="Căn phải"
          >
            ≣
          </button>
          <button
            type="button"
            className={`toolbar-btn ${activeEditor.isActive({ textAlign: 'justify' }) ? 'active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault()
              activeEditor.chain().focus().setTextAlign('justify').run()
            }}
            title="Căn đều hai bên"
          >
            ⩶
          </button>
        </>
      )}

      <div className="toolbar-divider" />

      {/* 11. Chèn link */}
      <button
        type="button"
        className={`toolbar-btn link-btn ${isLink ? 'active' : ''}`}
        onMouseDown={(e) => {
          e.preventDefault()
          handleToggleLink()
        }}
        title={isLink ? 'Gỡ liên kết (link)' : 'Chèn liên kết (link)'}
      >
        🔗
      </button>

      {/* 12. Chèn Emoji nhanh */}
      <div className="toolbar-popover-wrapper" ref={emojiRef}>
        <button
          type="button"
          className="toolbar-btn"
          onMouseDown={(e) => {
            e.preventDefault()
            setEmojiMenuOpen((prev) => !prev)
          }}
          title="Chèn biểu tượng cảm xúc (Emoji)"
        >
          ☺
        </button>

        {emojiMenuOpen && (
          <div className="toolbar-popover emoji-popover">
            <div className="emoji-grid">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji-btn"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    activeEditor.chain().focus().insertContent(emoji).run()
                    setEmojiMenuOpen(false)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 13. Xóa định dạng */}
      <button
        type="button"
        className="toolbar-btn clear-btn"
        onMouseDown={(e) => {
          e.preventDefault()
          activeEditor.chain().focus().unsetAllMarks().clearNodes().run()
        }}
        title="Xóa toàn bộ định dạng"
      >
        ⌫
      </button>
    </div>
  )
}
