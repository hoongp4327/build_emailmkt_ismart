import React, { useEffect, useId, useRef, useState, useCallback } from 'react'
import { UPLOAD_PATH, validateImageFile } from '../../uploadPolicy.js'
import { compressImage } from './compressImage.js'
import { getRecentImages, addRecentImage } from './recentImages.js'

/**
 * Component ImagePicker đa năng cho Email Builder.
 * Hỗ trợ 4 cách nhập ảnh:
 * 1. Chọn file từ máy
 * 2. Kéo thả file
 * 3. Ctrl+V ảnh từ clipboard (hỗ trợ cả dán toàn trang khi đang chọn khối)
 * 4. Dán URL HTTPS trực tiếp
 * Kèm kho ảnh gần đây (20 URL) trong localStorage.
 *
 * @param {Object} props
 * @param {string} props.value - URL ảnh hiện tại
 * @param {Function} props.onChange - Callback (url) => void
 * @param {'image'|'qr'|'banner'|'mascot'} [props.kind='image']
 * @param {string} [props.label='Ảnh']
 * @param {Function} [props.onBusyChange] - Callback (isBusy) => void
 * @param {boolean} [props.isSelectedBlock=false] - Cờ khối cha đang được chọn (để nhận Ctrl+V toàn trang)
 */
export function ImagePicker({
  value = '',
  onChange,
  kind = 'image',
  label = 'Chọn ảnh',
  onBusyChange,
  isSelectedBlock = false,
}) {
  const inputId = useId()
  const pickerRef = useRef(null)
  const abortControllerRef = useRef(null)
  const lastFileRef = useRef(null)

  const [busy, setBusy] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [dragging, setDragging] = useState(false)
  const [showRecent, setShowRecent] = useState(false)
  const [recentImages, setRecentImages] = useState(() => getRecentImages())

  // Báo trạng thái bận ra ngoài
  const setBusyState = useCallback(
    (isBusy, text = '') => {
      setBusy(isBusy)
      setStatusText(text)
      onBusyChange?.(isBusy)
    },
    [onBusyChange]
  )

  // Hủy request khi component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
        onBusyChange?.(false)
      }
    }
  }, [onBusyChange])

  // Kiểm tra URL link ngoài
  const isExternalUrl = Boolean(
    value &&
      typeof value === 'string' &&
      value.startsWith('https://') &&
      !value.includes('res.cloudinary.com')
  )

  // Xử lý nén và tải ảnh lên Cloudinary
  const handleUploadFile = useCallback(
    async (fileToUpload) => {
      if (!fileToUpload) return

      setError('')
      setWarning('')
      lastFileRef.current = fileToUpload

      // Kiểm tra định dạng cơ bản
      const validationError = validateImageFile(fileToUpload)
      if (validationError) {
        setError(validationError)
        return
      }

      setBusyState(true, 'Đang nén ảnh...')

      let processedFile = fileToUpload
      try {
        const compressed = await compressImage(fileToUpload, { kind })
        processedFile = compressed.file
        if (compressed.warning) {
          setWarning(compressed.warning)
        }
      } catch (compErr) {
        setBusyState(false)
        setError(compErr.message || 'Lỗi khi xử lý nén ảnh.')
        return
      }

      setBusyState(true, 'Đang tải lên Cloudinary...')
      const controller = new AbortController()
      abortControllerRef.current = controller
      const timeoutId = window.setTimeout(() => controller.abort(), 40000)

      try {
        const response = await fetch(`${UPLOAD_PATH}?kind=${kind}`, {
          method: 'POST',
          headers: { 'Content-Type': processedFile.type },
          body: processedFile,
          signal: controller.signal,
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Tải ảnh quá nhanh, vui lòng đợi 1 phút')
          }
          throw new Error(
            data?.error ||
              'Tính năng tải ảnh chưa sẵn sàng. Bạn có thể dán link ảnh hoặc thử lại sau.'
          )
        }

        if (!data?.url?.startsWith('https://')) {
          throw new Error('Chưa nhận được đường dẫn ảnh. Vui lòng thử lại.')
        }

        // Thành công: cập nhật URL ảnh và thêm vào kho ảnh gần đây
        onChange?.(data.url)
        const updatedRecent = addRecentImage(data.url)
        setRecentImages(updatedRecent)
        setBusyState(false, '✓ Đã tải ảnh lên thành công.')
      } catch (err) {
        setBusyState(false)
        if (err.name === 'AbortError') {
          setError('Tải ảnh quá lâu. Vui lòng kiểm tra kết nối mạng và thử lại.')
        } else {
          setError(err.message || 'Không thể tải ảnh lên kho lưu trữ.')
        }
      } finally {
        window.clearTimeout(timeoutId)
        abortControllerRef.current = null
      }
    },
    [kind, onChange, setBusyState]
  )

  // Nút Thử lại khi gặp lỗi (đặc biệt là 429)
  function handleRetry() {
    if (lastFileRef.current) {
      handleUploadFile(lastFileRef.current)
    }
  }

  // Bắt sự kiện Paste (Ctrl+V) toàn trang khi khối đang chọn
  useEffect(() => {
    if (!isSelectedBlock) return

    function handleGlobalPaste(e) {
      // Chỉ xử lý khi document.activeElement KHÔNG phải input, textarea hay contenteditable
      const activeEl = document.activeElement
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)

      if (isTyping) return

      const items = e.clipboardData?.items || []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            handleUploadFile(file)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [isSelectedBlock, handleUploadFile])

  // Xử lý dán vào chính component ImagePicker
  function handleContainerPaste(e) {
    const items = e.clipboardData?.items || []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          handleUploadFile(file)
          break
        }
      }
    }
  }

  // Xử lý dán URL ngoài bằng tay
  function handleUrlChange(newUrl) {
    setError('')
    setWarning('')
    onChange?.(newUrl)
    if (newUrl && newUrl.startsWith('https://')) {
      const updated = addRecentImage(newUrl)
      setRecentImages(updated)
    }
  }

  // Chọn ảnh từ kho ảnh gần đây
  function handleSelectRecent(url) {
    handleUrlChange(url)
    setShowRecent(false)
  }

  return (
    <div
      className="image-picker-component"
      tabIndex={0}
      onPaste={handleContainerPaste}
      aria-label={label}
    >
      {/* 1. DROPZONE TẢI ẢNH */}
      <input
        ref={pickerRef}
        id={inputId}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleUploadFile(file)
        }}
      />

      <div
        className={`image-dropzone ${dragging ? 'is-dragging' : ''} ${value ? 'has-image' : ''}`}
        onClick={() => !busy && pickerRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!busy && e.dataTransfer.files?.length) {
            handleUploadFile(e.dataTransfer.files[0])
          }
        }}
        title="Bấm để chọn file, kéo thả ảnh hoặc nhấn Ctrl+V để dán"
      >
        {value ? (
          <div className="preview-thumbnail-box">
            <img src={value} alt="Xem trước" className="upload-thumbnail" />
          </div>
        ) : (
          <div className="upload-icon-box">🖼</div>
        )}

        <div className="image-dropzone-info">
          <strong>
            {busy ? statusText || 'Đang tải ảnh lên…' : value ? 'Thay đổi ảnh' : 'Tải ảnh lên'}
          </strong>
          <small>
            {value
              ? 'Bấm, kéo thả hoặc nhấn Ctrl+V để đổi ảnh mới'
              : 'Bấm chọn, kéo thả hoặc nhấn Ctrl+V (Max 4 MB)'}
          </small>
        </div>

        {value && !busy && (
          <button
            type="button"
            className="clear-image-btn"
            title="Gỡ ảnh này"
            onClick={(e) => {
              e.stopPropagation()
              onChange?.('')
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Ô DÁN ĐƯỜNG DẪN URL */}
      <div className="image-url-input-row">
        <label className="sub-field-label">Hoặc dán link ảnh HTTPS:</label>
        <div className="url-input-wrapper">
          <input
            type="url"
            value={value || ''}
            placeholder="https://res.cloudinary.com/..."
            disabled={busy}
            onChange={(e) => handleUrlChange(e.target.value.trim())}
          />
        </div>
      </div>

      {/* Cảnh báo link ngoài */}
      {isExternalUrl && (
        <div className="external-url-notice">
          ⚠️ Ảnh từ link ngoài có thể mất nếu trang gốc xóa ảnh.
        </div>
      )}

      {/* Cảnh báo chất lượng QR */}
      {warning && (
        <div className="image-picker-warning">
          ⚠️ {warning}
        </div>
      )}

      {/* 3. KHO ẢNH GẦN ĐÂY */}
      {recentImages.length > 0 && (
        <div className="recent-images-section">
          <button
            type="button"
            className="toggle-recent-btn"
            onClick={() => setShowRecent((prev) => !prev)}
          >
            <span>📷 Kho ảnh gần đây ({recentImages.length})</span>
            <span>{showRecent ? '▲' : '▼'}</span>
          </button>

          {showRecent && (
            <div className="recent-images-grid">
              {recentImages.map((recentUrl, idx) => (
                <button
                  key={`${recentUrl}-${idx}`}
                  type="button"
                  className={`recent-thumbnail-btn ${recentUrl === value ? 'selected' : ''}`}
                  title={recentUrl}
                  onClick={() => handleSelectRecent(recentUrl)}
                >
                  <img src={recentUrl} alt={`Gần đây ${idx + 1}`} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TRẠNG THÁI & NÚT THỬ LẠI KHI LỖI */}
      {statusText && !error && !busy && (
        <div className="upload-status-msg success">{statusText}</div>
      )}

      {error && (
        <div className="upload-status-msg error">
          <span>{error}</span>
          {lastFileRef.current && (
            <button type="button" className="retry-btn" onClick={handleRetry}>
              🔄 Thử lại
            </button>
          )}
        </div>
      )}
    </div>
  )
}
export default ImagePicker
