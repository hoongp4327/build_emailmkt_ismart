import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_CONTENT, DEFAULT_IMAGES } from './defaultContent'
import { buildEmail, parseCta } from './emailTemplate'
import ImageUploadField from './ImageUploadField'

const STORAGE_KEY = 'ismart-email-builder-v1'

function Icon({ name, size = 18 }) {
  const paths = {
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    phone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    refresh: <><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></>,
    chevron: <path d="m6 9 6 6 6-6"/>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function loadStored() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return {
      content: typeof saved?.content === 'string' ? saved.content : DEFAULT_CONTENT,
      images: { ...DEFAULT_IMAGES, ...(saved?.images || {}) },
    }
  } catch {
    return { content: DEFAULT_CONTENT, images: DEFAULT_IMAGES }
  }
}

function App() {
  const initial = useMemo(loadStored, [])
  const [content, setContent] = useState(initial.content)
  const [images, setImages] = useState(initial.images)
  const [device, setDevice] = useState('desktop')
  const [saveState, setSaveState] = useState('Đã lưu tự động')
  const [toast, setToast] = useState('')
  const [imageSettingsOpen, setImageSettingsOpen] = useState(false)
  const [previewVersion, setPreviewVersion] = useState(0)
  const toastTimer = useRef(null)
  const [uploading, setUploading] = useState({})
  const imagesUploading = Object.values(uploading).some(Boolean)
  const setUploadBusy = (slot, busy) => setUploading(current => ({ ...current, [slot]: busy }))

  const email = useMemo(() => buildEmail(content, images), [content, images, previewVersion])
  const ctas = content.split('\n').map((line, index) => ({ ...parseCta(line), index })).filter(cta => cta.label)
  const alignCta = (index, align) => setContent(current => current.split('\n').map((line, lineIndex) => {
    const cta = lineIndex === index ? parseCta(line) : null
    return cta ? `[CTA: ${cta.label}|${cta.url}|${align}]` : line
  }).join('\n'))

  useEffect(() => {
    setSaveState('Đang lưu…')
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ content, images }))
        setSaveState('Đã lưu tự động')
      } catch {
        setSaveState('Chưa lưu được trên máy')
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [content, images])

  const showToast = (message) => {
    setToast(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }

  const copyForGmail = async () => {
    try {
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([email.fragment], { type: 'text/html' }),
            'text/plain': new Blob([email.plainText], { type: 'text/plain' }),
          }),
        ])
      } else {
        const node = document.createElement('div')
        node.contentEditable = 'true'
        node.style.position = 'fixed'
        node.style.left = '-99999px'
        node.innerHTML = email.fragment
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
      showToast('Đã sao chép email')
    } catch {
      showToast('Không thể sao chép. Hãy thử lại trên HTTPS.')
    }
  }

  const downloadHtml = () => {
    const blob = new Blob([email.document], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'email-marketing-ilead.html'
    anchor.click()
    URL.revokeObjectURL(url)
    showToast('Đã tải file HTML')
  }

  const resetSample = () => {
    setContent(DEFAULT_CONTENT)
    setImages(DEFAULT_IMAGES)
    setPreviewVersion((value) => value + 1)
    showToast('Đã khôi phục nội dung mẫu')
  }

  const updateImage = (key, value) => setImages((current) => ({ ...current, [key]: value }))

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="iSMART Email Builder">
          <div className="wordmark"><span>i</span>SMART</div>
          <div className="brand-divider" />
          <div className="product-name">Email Builder</div>
        </div>
        <div className="save-status"><span className="status-check"><Icon name="check" size={14} /></span>{saveState}</div>
      </header>

      <main className="workspace">
        <section className="editor-panel" aria-labelledby="editor-heading">
          <div className="panel-heading">
            <div>
              <h1 id="editor-heading">Nội dung email</h1>
              <p>Dán nội dung dạng văn bản thuần túy. Trình dựng sẽ tự động định dạng theo mẫu iLEAD.</p>
            </div>
          </div>

          <label className="sr-only" htmlFor="email-content">Nội dung email marketing</label>
          <textarea id="email-content" value={content} onChange={(event) => setContent(event.target.value)} spellCheck="true" />

          <div className="cta-settings">
            <p>Nội dung email được căn đều hai lề. CTA trong phần iSSACC nằm dưới nội dung và ảnh, rộng bằng toàn bộ section.</p>
            {ctas.map(cta => <div className="cta-row" key={cta.index}>
              <span>{cta.label}</span>
              <div role="group" aria-label={`Căn nút ${cta.label}`}>
                {[['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải']].map(([value, label]) =>
                  <button type="button" key={value} aria-pressed={cta.align === value} onClick={() => alignCta(cta.index, value)}>{label}</button>
                )}
              </div>
            </div>)}
          </div>

          <div className="format-guide" aria-label="Hướng dẫn định dạng">
            <h2>Hướng dẫn định dạng</h2>
            <div className="guide-grid">
              <code>## TIÊU ĐỀ LỚN</code><span>Tiêu đề khu vực</span>
              <code>### Tiêu đề phụ</code><span>Nhóm nội dung</span>
              <code>📌 hoặc ✓ Nội dung</code><span>Dòng thông tin</span>
              <code>**Nội dung in đậm**</code><span>Chữ nhấn mạnh</span>
              <code>[CTA: Tên|https://...]</code><span>Nút liên kết</span>
              <code>[CTA: Tên|https://...|center]</code><span>Căn nút: left / center / right</span>
            </div>
          </div>

          <div className={`image-settings ${imageSettingsOpen ? 'is-open' : ''}`}>
            <button type="button" className="settings-trigger" onClick={() => setImageSettingsOpen((value) => !value)} aria-expanded={imageSettingsOpen}>
              <span>Cài đặt hình ảnh</span><Icon name="chevron" />
            </button>
            <div className="settings-body" hidden={!imageSettingsOpen}>
              <p className="image-storage-note">Chọn ảnh từ máy để tự lưu vào kho ảnh và chèn vào email. Ảnh được chia sẻ qua link công khai.</p>
              <ImageUploadField slot="banner" label="Banner" value={images.banner} onChange={updateImage} onBusyChange={setUploadBusy} />
              <ImageUploadField slot="benefit" label="Ảnh minh họa lợi ích" value={images.benefit} onChange={updateImage} onBusyChange={setUploadBusy} />
              <ImageUploadField slot="mascot" label="Mascot iSSACC" value={images.mascot} onChange={updateImage} onBusyChange={setUploadBusy} />
            </div>
          </div>

          <div className="editor-actions">
            <button type="button" className="button secondary" disabled={imagesUploading} onClick={resetSample}><Icon name="refresh" />Dùng nội dung mẫu</button>
            <button type="button" className="button orange" onClick={() => { setPreviewVersion((value) => value + 1); showToast('Đã cập nhật bản xem trước') }}>Tạo bản xem trước</button>
          </div>
        </section>

        <section className="preview-panel" aria-labelledby="preview-heading">
          <div className="preview-toolbar">
            <div className="preview-title-group">
              <h2 id="preview-heading">Bản xem trước Gmail</h2>
              <div className="device-switch" aria-label="Kích thước xem trước">
                <button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}><Icon name="monitor" />Máy tính</button>
                <button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}><Icon name="phone" />Điện thoại</button>
              </div>
            </div>
            <div className="preview-actions">
              <button type="button" className="button secondary compact" disabled={imagesUploading} onClick={downloadHtml}><Icon name="download" />Tải HTML</button>
              <button type="button" className="button primary compact" disabled={imagesUploading} onClick={copyForGmail}><Icon name="copy" />{imagesUploading ? 'Đang tải ảnh…' : 'Sao chép cho Gmail'}</button>
            </div>
          </div>

          <div className="preview-stage">
            <div className={`preview-frame ${device}`}>
              <iframe title="Bản xem trước email iLEAD" srcDoc={email.document} />
            </div>
          </div>
        </section>
      </main>

      {toast && <div className="toast" role="status"><span><Icon name="check" /></span>{toast}</div>}
    </div>
  )
}

export default App
