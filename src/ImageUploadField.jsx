import { useEffect, useId, useRef, useState } from 'react'
import { IMAGE_TYPES, UPLOAD_PATH, validateImageFile } from './uploadPolicy'

export default function ImageUploadField({
  slot,
  label,
  value,
  onChange,
  onBusyChange,
  hideUrlInput = true,
  hideTitle = true,
}) {
  const inputId = useId()
  const picker = useRef(null)
  const request = useRef(null)
  const busyCallback = useRef(onBusyChange)
  busyCallback.current = onBusyChange
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => () => {
    request.current?.abort()
    request.current = null
    busyCallback.current?.(slot, false)
  }, [slot])

  async function upload(files) {
    if (request.current) return
    setDragging(false)
    setMessage('')
    if (files.length !== 1) {
      setError('Vui lòng chọn một ảnh cho mỗi vị trí.')
      return
    }
    const file = files[0]
    const validation = validateImageFile(file)
    if (validation) {
      setError(validation)
      return
    }
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 40000)
    setBusy(true)
    setError('')
    onBusyChange?.(slot, true)
    try {
      const response = await fetch(`${UPLOAD_PATH}?slot=${slot}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
        signal: controller.signal,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Bạn tải ảnh quá nhanh. Vui lòng thử lại sau một phút.')
        }
        throw new Error(data?.error || 'Tính năng tải ảnh chưa sẵn sàng. Bạn có thể dán link ảnh hoặc thử lại sau.')
      }
      if (!data?.url?.startsWith('https://')) {
        throw new Error('Chưa nhận được đường dẫn ảnh. Vui lòng thử lại.')
      }
      if (request.current !== controller) return
      onChange(slot, data.url)
      setMessage('✓ Đã tải ảnh lên Cloudinary thành công.')
    } catch (failure) {
      if (request.current === controller) {
        setError(
          failure.name === 'AbortError'
            ? 'Tải ảnh quá lâu. Vui lòng kiểm tra kết nối và thử lại.'
            : failure.message
        )
      }
    } finally {
      window.clearTimeout(timeout)
      if (request.current === controller) {
        request.current = null
        setBusy(false)
        onBusyChange?.(slot, false)
      }
    }
  }

  return (
    <div className="image-upload-field" role="group" aria-label={label} aria-busy={busy}>
      {!hideTitle && <div className="image-field-title">{label}</div>}

      <input
        ref={picker}
        id={inputId}
        className="sr-only"
        tabIndex={-1}
        type="file"
        aria-label={`Chọn ảnh ${label}`}
        accept={IMAGE_TYPES.join(',')}
        disabled={busy}
        onChange={(event) => {
          const files = [...event.target.files]
          event.target.value = ''
          if (files.length) upload(files)
        }}
      />

      <button
        type="button"
        className={`image-dropzone${dragging ? ' is-dragging' : ''}${value ? ' has-image' : ''}`}
        disabled={busy}
        onClick={() => picker.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          if (!busy) upload([...event.dataTransfer.files])
        }}
        title="Nhấp để tải ảnh từ máy tính hoặc kéo thả tệp vào đây"
      >
        {value ? (
          <img src={value} alt="Xem trước" className="upload-thumbnail" />
        ) : (
          <div className="upload-icon-box">📁</div>
        )}

        <div className="image-dropzone-info">
          <strong>
            {busy ? 'Đang tải ảnh lên…' : value ? 'Đổi ảnh từ máy tính' : 'Chọn ảnh từ máy tính'}
          </strong>
          <small>
            {value ? 'Bấm hoặc kéo ảnh mới vào để thay thế' : 'Kéo thả hoặc bấm để tải (Tối đa 4 MB)'}
          </small>
        </div>
      </button>

      {!hideUrlInput && (
        <label className="image-url-label">
          Hoặc dán link ảnh
          <input
            type="url"
            value={value}
            disabled={busy}
            onChange={(event) => {
              setMessage('')
              setError('')
              onChange(slot, event.target.value)
            }}
          />
        </label>
      )}

      <div aria-live="polite">
        {message && <p className="upload-success">{message}</p>}
        {busy && <p className="upload-status">Đang lưu ảnh, vui lòng chờ trước khi sao chép email.</p>}
      </div>
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
