import React, { useEffect, useRef } from 'react'

const BLOCK_CATEGORIES = [
  {
    name: 'Nội dung cơ bản',
    items: [
      { type: 'heading', name: 'Tiêu đề', icon: 'H', desc: 'Đề mục cấp 1, 2 hoặc 3' },
      { type: 'text', name: 'Đoạn văn', icon: '¶', desc: 'Văn bản thường, nhiều đoạn' },
      { type: 'list', name: 'Danh sách', icon: '📋', desc: 'Các mục có biểu tượng 📌 ✓ •' },
      { type: 'image', name: 'Hình ảnh', icon: '🖼', desc: 'Ảnh tự do, banner, poster' },
      { type: 'button', name: 'Nút CTA', icon: '🔘', desc: 'Nút liên kết kêu gọi hành động' },
    ],
  },
  {
    name: 'Bố cục thẻ & Hộp',
    items: [
      { type: 'infoCard', name: 'Thẻ thông tin', icon: '🗂', desc: 'Hộp có header màu iSMART' },
      { type: 'imageText', name: 'Ảnh + Văn bản', icon: '📰', desc: 'Bố cục 2 cột xếp chồng mobile' },
      { type: 'offerCards', name: 'Khối ưu đãi', icon: '🎁', desc: 'Header cam kèm các card con' },
      { type: 'footer', name: 'Chân trang', icon: '📑', desc: 'Lời kết, hotline và chữ ký' },
    ],
  },
  {
    name: 'Thanh toán & Phân cách',
    items: [
      { type: 'payment', name: 'Chuyển khoản QR', icon: '💳', desc: 'STK ngân hàng + ảnh mã QR' },
      { type: 'divider', name: 'Đường kẻ', icon: '➖', desc: 'Đường phân chia khu vực' },
      { type: 'spacer', name: 'Khoảng trống', icon: '↕', desc: 'Tạo khoảng cách giữa các phần' },
    ],
  },
]

export function AddBlockMenu({ isOpen, onClose, onSelectType }) {
  const menuRef = useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside)
    }
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="add-block-modal-overlay">
      <div className="add-block-modal" ref={menuRef}>
        <div className="modal-header">
          <h3>Chọn loại khối muốn thêm</h3>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {BLOCK_CATEGORIES.map((cat) => (
            <div key={cat.name} className="block-category-section">
              <h4 className="category-title">{cat.name}</h4>
              <div className="category-grid">
                {cat.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className="block-select-card"
                    onClick={() => {
                      onSelectType(item.type)
                      onClose()
                    }}
                  >
                    <span className="card-icon">{item.icon}</span>
                    <span className="card-name">{item.name}</span>
                    <span className="card-desc">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
