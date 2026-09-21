import React, { useRef, useEffect, useState } from 'react'

/**
 * Khung sân khấu Preview email với cơ chế:
 * - Cập nhật DOM qua postMessage (không reload iframe, không giật màn hình, giữ nguyên scroll).
 * - Debounce ~200ms.
 * - Click-to-select có bảo mật (chỉ nhận từ đúng contentWindow và block ID hợp lệ).
 * - Tự động scroll tới khối được chọn và gắn viền highlight.
 */
export function PreviewStage({
  renderedDocument,
  renderedFragment,
  device = 'desktop',
  selectedBlockId,
  validBlockIds = [],
  onSelectBlock,
  isEmpty = false,
}) {
  const iframeRef = useRef(null)
  const [isIframeLoaded, setIsIframeLoaded] = useState(false)

  // Khởi tạo nội dung khung iframe ban đầu
  const initialHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin: 0; padding: 0; background: #eef7fc; font-family: Arial, Helvetica, sans-serif; }
    [data-block-id] {
      cursor: pointer !important;
      position: relative;
      transition: outline 0.15s ease, box-shadow 0.15s ease;
    }
    [data-block-id]:hover {
      outline: 2px dashed #0870c5 !important;
      outline-offset: -2px;
    }
    [data-block-id].is-selected {
      outline: 3px solid #ff641c !important;
      outline-offset: -3px;
      box-shadow: 0 0 12px rgba(255, 100, 28, 0.45) !important;
    }
    .empty-guide {
      text-align: center;
      padding: 70px 20px;
      font-family: Arial, Helvetica, sans-serif;
      color: #5c7694;
    }
    .empty-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-title { font-size: 19px; font-weight: 700; color: #082e6f; margin-bottom: 8px; }
    .empty-sub { font-size: 14px; color: #6b829d; }
  </style>
</head>
<body>
  <div id="content-root"></div>
  <script>
    const root = document.getElementById('content-root');

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'UPDATE_CONTENT') {
        const scrollY = window.scrollY;
        root.innerHTML = data.html;
        window.scrollTo(0, scrollY);
        updateSelection(data.selectedBlockId, false);
      } else if (data.type === 'SELECT_BLOCK') {
        updateSelection(data.blockId, data.scrollIntoView);
      }
    });

    function updateSelection(blockId, shouldScroll) {
      document.querySelectorAll('[data-block-id]').forEach(el => el.classList.remove('is-selected'));
      if (!blockId) return;

      const target = document.querySelector('[data-block-id="' + blockId + '"]');
      if (target) {
        target.classList.add('is-selected');
        if (shouldScroll) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-block-id]');
      if (target) {
        const blockId = target.getAttribute('data-block-id');
        window.parent.postMessage({ type: 'BLOCK_CLICKED', blockId }, '*');
      }
    });
  </script>
</body>
</html>`

  // 1. Nhận tin nhắn Click-to-select từ iframe với kiểm tra bảo mật nghiêm ngặt (Ràng buộc 8)
  useEffect(() => {
    const handleMessage = (event) => {
      // Chỉ nhận message từ đúng iframe preview
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return
      }

      if (event.data?.type === 'BLOCK_CLICKED') {
        const blockId = event.data.blockId
        // Chỉ chấp nhận block id có trong doc
        if (blockId && validBlockIds.includes(blockId)) {
          if (onSelectBlock) {
            onSelectBlock(blockId)
          }
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [validBlockIds, onSelectBlock])

  // 2. Cập nhật HTML vào iframe qua postMessage (có debounce ~200ms) để không bị reload giật màn hình
  useEffect(() => {
    if (!isIframeLoaded || !iframeRef.current?.contentWindow) return

    const timer = setTimeout(() => {
      const contentHtml = isEmpty
        ? `<div class="empty-guide"><div class="empty-icon">✉️</div><div class="empty-title">Email chưa có khối nào</div><div class="empty-sub">Bấm <strong>+ Thêm khối</strong> ở cột bên trái để bắt đầu tạo email</div></div>`
        : renderedFragment

      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_CONTENT',
        html: contentHtml,
        selectedBlockId,
      }, '*')
    }, 200)

    return () => clearTimeout(timer)
  }, [renderedFragment, isEmpty, isIframeLoaded, selectedBlockId])

  // 3. Cuộn tới khối được chọn và highlight khi selectedBlockId thay đổi
  useEffect(() => {
    if (!isIframeLoaded || !iframeRef.current?.contentWindow || !selectedBlockId) return

    iframeRef.current.contentWindow.postMessage({
      type: 'SELECT_BLOCK',
      blockId: selectedBlockId,
      scrollIntoView: true,
    }, '*')
  }, [selectedBlockId, isIframeLoaded])

  return (
    <div className={`preview-frame ${device}`}>
      <iframe
        ref={iframeRef}
        title="Bản xem trước email marketing"
        srcDoc={initialHtml}
        onLoad={() => setIsIframeLoaded(true)}
      />
    </div>
  )
}
