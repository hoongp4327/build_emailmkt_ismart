import React, { useState, useMemo, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import { useHistory } from './editor/useHistory.js'
import { BlockList } from './editor/BlockList.jsx'
import { PreviewStage } from './editor/PreviewStage.jsx'
import { Inspector } from './editor/Inspector.jsx'
import { renderEmail } from './render/renderEmail.js'
import { createBlock, createDefaultDoc } from './model/defaults.js'
import { migrateV1toV2 } from './model/migrate.js'
import { TEMPLATES, paymentNoticeDoc, ileadOfferDoc } from './templates/index.js'
import { compressImage, addRecentImage } from './editor/image/index.js'

const STORAGE_KEY_V2 = 'ismart-email-builder-v2'
const STORAGE_KEY_V1 = 'ismart-email-builder-v1'

function loadInitialDoc() {
  try {
    const savedV2 = localStorage.getItem(STORAGE_KEY_V2)
    if (savedV2) {
      const parsed = JSON.parse(savedV2)
      if (parsed && parsed.version === 2 && Array.isArray(parsed.blocks)) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('Lỗi đọc dữ liệu v2:', err)
  }

  // Tự động migrate dữ liệu từ v1 nếu có
  try {
    const savedV1 = localStorage.getItem(STORAGE_KEY_V1)
    if (savedV1) {
      const parsedV1 = JSON.parse(savedV1)
      if (parsedV1 && (parsedV1.content || parsedV1.images)) {
        const migrated = migrateV1toV2(parsedV1)
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated))
        return migrated
      }
    }
  } catch (err) {
    console.warn('Lỗi migrate dữ liệu v1:', err)
  }

  return paymentNoticeDoc
}

export default function App() {
  const initialDoc = useMemo(loadInitialDoc, [])
  const {
    doc,
    setDoc,
    undo,
    redo,
    canUndo,
    canRedo,
    pastCount,
    resetHistory,
  } = useHistory(initialDoc)

  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [device, setDevice] = useState('desktop')
  const [saveState, setSaveState] = useState('Đã lưu tự động')
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const [uploading, setUploading] = useState({})
  const imagesUploading = Object.values(uploading).some(Boolean)
  const setUploadBusy = (slot, busy) => setUploading((current) => ({ ...current, [slot]: busy }))

  // Mobile tab chuyển đổi giữa [Danh sách khối] và [Xem trước] khi < 1024px
  const [mobileTab, setMobileTab] = useState('editor') // 'editor' | 'preview'
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false)
  const templateMenuRef = useRef(null)

  // Đóng dropdown mẫu email khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target)) {
        setTemplateMenuOpen(false)
      }
    }
    if (templateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [templateMenuOpen])

  // Lắng nghe sự kiện toast toàn cục (ví dụ dán ảnh vào RichText)
  useEffect(() => {
    function handleCustomToast(e) {
      if (e.detail?.message) {
        showToast(e.detail.message, e.detail.action)
      }
    }
    window.addEventListener('ismart-toast', handleCustomToast)
    return () => window.removeEventListener('ismart-toast', handleCustomToast)
  }, [])

  // Bắt Ctrl+V toàn trang khi clipboard có image/* và không gõ trong input/textarea/contenteditable
  useEffect(() => {
    function handleGlobalPagePaste(e) {
      const activeEl = document.activeElement
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable ||
          Boolean(activeEl.closest?.('[contenteditable="true"]')))

      if (isTyping) return

      // Nếu khối đang chọn là image, payment hoặc imageText thì ImagePicker của khối đó sẽ xử lý
      const selectedBlock = doc.blocks.find((b) => b.id === selectedBlockId)
      if (
        selectedBlock &&
        (selectedBlock.type === 'image' ||
          selectedBlock.type === 'payment' ||
          selectedBlock.type === 'imageText')
      ) {
        return
      }

      const items = e.clipboardData?.items || []
      let imageFile = null
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          imageFile = item.getAsFile()
          break
        }
      }

      if (!imageFile) return

      e.preventDefault()

      // Tự động tạo khối image mới
      const newImgBlock = createBlock('image')
      setDoc(
        (prev) => {
          const blocks = [...prev.blocks]
          if (!selectedBlockId) {
            blocks.push(newImgBlock)
          } else {
            const idx = blocks.findIndex((b) => b.id === selectedBlockId)
            if (idx === -1) blocks.push(newImgBlock)
            else blocks.splice(idx + 1, 0, newImgBlock)
          }
          return { ...prev, blocks }
        },
        { immediate: true }
      )

      setSelectedBlockId(newImgBlock.id)
      showToast('Đang xử lý ảnh từ clipboard...')

      compressImage(imageFile, { kind: 'image' })
        .then(async ({ file, warning }) => {
          if (warning) showToast(warning)
          setImagesUploading(true)
          const resp = await fetch('/api/upload-image?kind=image', {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          const data = await resp.json().catch(() => null)
          if (!resp.ok || !data?.url?.startsWith('https://')) {
            throw new Error(data?.error || 'Không thể tải ảnh lên kho lưu trữ.')
          }
          setDoc(
            (prev) => ({
              ...prev,
              blocks: prev.blocks.map((b) =>
                b.id === newImgBlock.id ? { ...b, props: { ...b.props, src: data.url } } : b
              ),
            }),
            { immediate: true }
          )
          addRecentImage(data.url)
          showToast('✓ Đã chèn ảnh thành công.')
        })
        .catch((err) => {
          showToast(err.message || 'Lỗi khi tải ảnh từ clipboard')
        })
        .finally(() => {
          setImagesUploading(false)
        })
    }

    window.addEventListener('paste', handleGlobalPagePaste)
    return () => window.removeEventListener('paste', handleGlobalPagePaste)
  }, [doc.blocks, selectedBlockId, setDoc, setImagesUploading])

  // 1. Tự động bỏ chọn nếu block đang chọn không còn tồn tại (sau undo / xóa - Ràng buộc 7)
  useEffect(() => {
    if (selectedBlockId && !doc.blocks.some((b) => b.id === selectedBlockId)) {
      setSelectedBlockId(null)
    }
  }, [doc.blocks, selectedBlockId])

  // 2. Tự động lưu LocalStorage có debounce ~450ms
  useEffect(() => {
    setSaveState('Đang lưu…')
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(doc))
        setSaveState('Đã lưu tự động')
      } catch {
        setSaveState('Bộ nhớ trình duyệt đầy')
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [doc])

  // 3. Render email cho Preview (có data-block-id) và cho Copy/Download (hoàn toàn sạch - Ràng buộc 4)
  const cleanEmail = useMemo(() => renderEmail(doc, { previewMode: false }), [doc])
  const previewEmail = useMemo(() => renderEmail(doc, { previewMode: true }), [doc])

  const selectedBlock = useMemo(() => {
    return doc.blocks.find((b) => b.id === selectedBlockId) || null
  }, [doc.blocks, selectedBlockId])

  const validBlockIds = useMemo(() => {
    return doc.blocks.map((b) => b.id)
  }, [doc.blocks])

  function showToast(message, action = null) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, action })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }

  // --- CÁC THAO TÁC BLOCK (CRUD) ---

  // Thêm khối mới (chèn ngay dưới khối đang chọn - Ràng buộc 9)
  function handleAddBlock(type) {
    const newBlock = createBlock(type)
    setDoc((prev) => {
      const blocks = [...prev.blocks]
      if (!selectedBlockId) {
        blocks.push(newBlock)
      } else {
        const idx = blocks.findIndex((b) => b.id === selectedBlockId)
        if (idx === -1) blocks.push(newBlock)
        else blocks.splice(idx + 1, 0, newBlock)
      }
      return { ...prev, blocks }
    }, { immediate: true })

    setSelectedBlockId(newBlock.id)
    showToast(`Đã thêm khối mới`)
  }

  // Nhân bản khối
  function handleDuplicateBlock(blockId) {
    const target = doc.blocks.find((b) => b.id === blockId)
    if (!target) return

    const cloned = {
      ...JSON.parse(JSON.stringify(target)),
      id: nanoid(),
    }

    setDoc((prev) => {
      const idx = prev.blocks.findIndex((b) => b.id === blockId)
      const blocks = [...prev.blocks]
      blocks.splice(idx + 1, 0, cloned)
      return { ...prev, blocks }
    }, { immediate: true })

    setSelectedBlockId(cloned.id)
    showToast('Đã nhân bản khối')
  }

  // Xóa khối (kèm nút Hoàn tác trong Toast - Ràng buộc 11)
  function handleDeleteBlock(blockId) {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== blockId),
    }), { immediate: true })

    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }

    showToast('Đã xóa khối', {
      label: 'Hoàn tác',
      onClick: () => undo(),
    })
  }

  // Ẩn / Hiện khối
  function handleToggleHidden(blockId) {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, style: { ...b.style, hidden: !b.style?.hidden } } : b
      ),
    }), { immediate: true })
  }

  // Di chuyển lên / xuống 1 vị trí
  function handleMoveBlock(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= doc.blocks.length) return
    setDoc((prev) => {
      const blocks = [...prev.blocks]
      const [moved] = blocks.splice(fromIndex, 1)
      blocks.splice(toIndex, 0, moved)
      return { ...prev, blocks }
    }, { immediate: true })
  }

  // Sắp xếp kéo thả @dnd-kit
  function handleReorderBlocks(oldIndex, newIndex) {
    setDoc((prev) => {
      const blocks = [...prev.blocks]
      const [moved] = blocks.splice(oldIndex, 1)
      blocks.splice(newIndex, 0, moved)
      return { ...prev, blocks }
    }, { immediate: true })
  }

  // Thay đổi cài đặt chung email
  function handleChangeSettings(newSettings) {
    setDoc((prev) => ({
      ...prev,
      settings: newSettings,
    }))
  }

  // Thay đổi props của block đang chọn (có debounce khi gõ chữ)
  function handleChangeBlockProps(newProps) {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === selectedBlockId ? { ...b, props: newProps } : b)),
    }), { debounce: true })
  }

  // Thay đổi style của block đang chọn (lưu ngay)
  function handleChangeBlockStyle(newStyle) {
    setDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === selectedBlockId ? { ...b, style: newStyle } : b)),
    }), { immediate: true })
  }

  // Tải mẫu email có sẵn (kèm xác nhận)
  function handleSelectTemplate(template) {
    if (window.confirm(`Tải mẫu "${template.name}"? Mọi khối tự tạo hiện tại sẽ được thay bằng mẫu này.`)) {
      resetHistory(JSON.parse(JSON.stringify(template.doc)))
      setSelectedBlockId(null)
      setTemplateMenuOpen(false)
      showToast(`✓ Đã tải mẫu: ${template.name}`)
    }
  }

  // Khởi tạo trang trắng mới
  function handleNewBlankDoc() {
    if (window.confirm('Tạo email trống mới? Mọi khối hiện tại trên trang sẽ bị xóa.')) {
      resetHistory(createDefaultDoc({}, []))
      setSelectedBlockId(null)
      setTemplateMenuOpen(false)
      showToast('✓ Đã tạo email trống')
    }
  }

  // Sao chép HTML cho Gmail (sử dụng cleanEmail sạch 100% không có data-block-id)
  async function handleCopyForGmail() {
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([cleanEmail.fragment], { type: 'text/html' }),
            'text/plain': new Blob([cleanEmail.plainText], { type: 'text/plain' }),
          }),
        ])
      } else {
        const node = document.createElement('div')
        node.contentEditable = 'true'
        node.style.position = 'fixed'
        node.style.left = '-99999px'
        node.innerHTML = cleanEmail.fragment
        document.body.appendChild(node)
        const range = document.createRange()
        range.selectNodeContents(node)
        const selection = window.getSelection()
        selection.removeAllRanges()
        selection.addRange(range)
        document.execCommand('copy')
        selection.removeAllRanges()
        node.remove()
      }
      showToast('✓ Đã sao chép email! Dán (Ctrl+V) vào Gmail compose.')
    } catch {
      showToast('Không thể sao chép. Hãy thử lại trên kết nối HTTPS.')
    }
  }

  // Tải file HTML sạch (không có data-block-id)
  function handleDownloadHtml() {
    const blob = new Blob([cleanEmail.document], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'email-marketing-ismart.html'
    anchor.click()
    URL.revokeObjectURL(url)
    showToast('✓ Đã tải file HTML email')
  }

  return (
    <div className="app-shell">
      {/* 1. TOPBAR */}
      <header className="topbar">
        <div className="brand" aria-label="iSMART Email Builder v2">
          <div className="wordmark"><span>i</span>SMART</div>
          <div className="brand-divider" />
          <div className="product-name">Email Builder <span className="version-badge">v2</span></div>
        </div>

        <div className="history-controls">
          <button
            type="button"
            className="history-btn"
            disabled={!canUndo}
            title="Hoàn tác (Ctrl+Z)"
            onClick={undo}
          >
            ↩ Hoàn tác {pastCount > 0 ? `(${pastCount})` : ''}
          </button>
          <button
            type="button"
            className="history-btn"
            disabled={!canRedo}
            title="Làm lại (Ctrl+Shift+Z)"
            onClick={redo}
          >
            ↪ Làm lại
          </button>
          <span className="save-status-text">
            <span className="dot" /> {saveState}
          </span>
        </div>

        <div className="topbar-actions">
          <div className="template-dropdown-wrapper" ref={templateMenuRef}>
            <button
              type="button"
              className="button secondary compact template-btn"
              title="Chọn mẫu email có sẵn hoặc làm mới"
              onClick={() => setTemplateMenuOpen((prev) => !prev)}
            >
              <span>📋 Mẫu email</span>
              <span className="dropdown-caret">▾</span>
            </button>

            {templateMenuOpen && (
              <div className="template-menu-popover">
                <div className="template-menu-header">Mẫu email có sẵn</div>
                <div className="template-menu-list">
                  {TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      className="template-menu-item"
                      onClick={() => handleSelectTemplate(tmpl)}
                    >
                      <div className="template-item-top">
                        <span className="template-item-name">{tmpl.name}</span>
                        {tmpl.badge && <span className="template-item-badge">{tmpl.badge}</span>}
                      </div>
                      <div className="template-item-desc">{tmpl.desc}</div>
                    </button>
                  ))}
                  <div className="template-menu-divider" />
                  <button
                    type="button"
                    className="template-menu-item"
                    onClick={handleNewBlankDoc}
                  >
                    <div className="template-item-top">
                      <span className="template-item-name">➕ Mẫu trống</span>
                    </div>
                    <div className="template-item-desc">Khởi tạo email trắng để tự kéo thả khối từ đầu</div>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="button secondary compact"
            disabled={imagesUploading}
            title="Tải tệp HTML email về máy tính"
            onClick={handleDownloadHtml}
          >
            Tải HTML
          </button>
          <button
            type="button"
            className="button orange compact main-copy-btn"
            disabled={imagesUploading}
            title="Sao chép nội dung HTML định dạng chuẩn để dán vào Gmail"
            onClick={handleCopyForGmail}
          >
            {imagesUploading ? 'Đang tải ảnh…' : 'Sao chép cho Gmail'}
          </button>
        </div>
      </header>

      {/* MOBILE TAB BAR (< 1024px) */}
      <div className="mobile-tabs-bar">
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'editor' ? 'active' : ''}`}
          onClick={() => setMobileTab('editor')}
        >
          ☰ Danh sách khối ({doc.blocks.length})
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileTab('preview')}
        >
          👁 Xem trước
        </button>
      </div>

      {/* 2. MAIN 3-ZONE WORKSPACE */}
      <main className="workspace-v2">
        {/* VÙNG TRÁI (~300px): DANH SÁCH KHỐI KÉO THẢ */}
        <div className={`workspace-col left-col ${mobileTab === 'editor' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <BlockList
            blocks={doc.blocks}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onAddBlock={handleAddBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onDeleteBlock={handleDeleteBlock}
            onToggleHidden={handleToggleHidden}
            onMoveBlock={handleMoveBlock}
            onReorderBlocks={handleReorderBlocks}
          />
        </div>

        {/* VÙNG GIỮA (FLEX 1): PREVIEW SÂN KHẤU (CLICK-TO-SELECT) */}
        <div className={`workspace-col center-col ${mobileTab === 'preview' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <div className="preview-toolbar">
            <span className="preview-title">Xem trước email</span>
            <div className="device-switch" aria-label="Kích thước xem trước">
              <button
                type="button"
                className={device === 'desktop' ? 'active' : ''}
                onClick={() => setDevice('desktop')}
              >
                Máy tính (640px)
              </button>
              <button
                type="button"
                className={device === 'mobile' ? 'active' : ''}
                onClick={() => setDevice('mobile')}
              >
                Điện thoại
              </button>
            </div>
          </div>

          <PreviewStage
            renderedDocument={previewEmail.document}
            renderedFragment={previewEmail.fragment}
            device={device}
            selectedBlockId={selectedBlockId}
            validBlockIds={validBlockIds}
            onSelectBlock={(id) => {
              setSelectedBlockId(id)
              // Khi click chọn trong preview trên mobile, chuyển sang tab editor để mở inspector
              if (window.innerWidth < 1024) {
                setMobileTab('editor')
              }
            }}
            isEmpty={doc.blocks.length === 0}
          />
        </div>

        {/* VÙNG PHẢI (~340px): INSPECTOR BIÊN TẬP THUỘC TÍNH */}
        <div className={`workspace-col right-col ${selectedBlockId ? 'has-selection' : ''}`}>
          <Inspector
            selectedBlock={selectedBlock}
            settings={doc.settings}
            onChangeSettings={handleChangeSettings}
            onChangeBlockProps={handleChangeBlockProps}
            onChangeBlockStyle={handleChangeBlockStyle}
            onDeselectBlock={() => setSelectedBlockId(null)}
            onDeleteBlock={handleDeleteBlock}
            onBusyChange={setUploadBusy}
          />
        </div>
      </main>

      {/* TOAST THÔNG BÁO (KÈM NÚT HOÀN TÁC KHI XÓA) */}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action-btn"
              onClick={() => {
                toast.action.onClick()
                setToast(null)
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
