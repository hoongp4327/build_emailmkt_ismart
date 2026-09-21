import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { extractPlainText } from '../render/richText.js'

const BLOCK_ICONS = {
  heading: 'H',
  text: '¶',
  image: '🖼',
  list: '📋',
  infoCard: '🗂',
  imageText: '📰',
  offerCards: '🎁',
  button: '🔘',
  payment: '💳',
  divider: '➖',
  spacer: '↕',
  footer: '📑',
}

const BLOCK_NAMES = {
  heading: 'Tiêu đề',
  text: 'Văn bản',
  image: 'Hình ảnh',
  list: 'Danh sách',
  infoCard: 'Thẻ thông tin',
  imageText: 'Ảnh + Văn bản',
  offerCards: 'Khối ưu đãi',
  button: 'Nút CTA',
  payment: 'Chuyển khoản QR',
  divider: 'Đường kẻ',
  spacer: 'Khoảng trống',
  footer: 'Chân trang',
}

function getBlockSummary(block) {
  const p = block.props || {}
  switch (block.type) {
    case 'heading':
      return extractPlainText(p.html) || 'Tiêu đề'
    case 'text':
      return extractPlainText(p.html).slice(0, 38) || 'Đoạn văn bản'
    case 'image':
      return p.alt || (p.src ? 'Ảnh đã chèn' : 'Chưa có ảnh')
    case 'list':
      return `${p.items?.length || 0} mục (${p.marker || '•'})`
    case 'infoCard':
      return p.title || 'Thẻ thông tin'
    case 'imageText':
      return p.alt || '2 cột chữ + ảnh'
    case 'offerCards':
      return p.title || 'Ưu đãi đặc biệt'
    case 'button':
      return p.label || 'Nút bấm'
    case 'payment':
      return p.bankName ? `${p.bankName} - ${p.accountNo}` : 'Thông tin thanh toán'
    case 'divider':
      return 'Đường phân cách'
    case 'spacer':
      return `Cao ${p.height || 20}px`
    case 'footer':
      return p.closingLine || 'Kết thư & Trân trọng'
    default:
      return ''
  }
}

export function SortableBlockItem({
  block,
  isSelected,
  onSelect,
  onDuplicate,
  onToggleHidden,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 999 : 'auto',
  }

  const isHidden = Boolean(block.style?.hidden)
  const icon = BLOCK_ICONS[block.type] || '▢'
  const typeName = BLOCK_NAMES[block.type] || block.type
  const summary = getBlockSummary(block)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block-item ${isSelected ? 'is-selected' : ''} ${isHidden ? 'is-hidden' : ''}`}
      onClick={() => onSelect(block.id)}
    >
      <div
        className="drag-handle"
        title="Kéo thả sắp xếp (hoặc bấm Space để điều khiển bằng bàn phím)"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>

      <div className="block-type-badge" title={typeName}>
        {icon}
      </div>

      <div className="block-info">
        <div className="block-header-line">
          <span className="block-type-name">{typeName}</span>
          {isHidden && <span className="hidden-tag">Đã ẩn</span>}
        </div>
        <div className="block-summary-text" title={summary}>
          {summary}
        </div>
      </div>

      <div className="block-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="action-btn"
          title={isHidden ? 'Hiện khối' : 'Ẩn khối'}
          onClick={() => onToggleHidden(block.id)}
        >
          {isHidden ? '👁️‍🗨️' : '👁'}
        </button>
        <button
          type="button"
          className="action-btn"
          title="Nhân bản khối này"
          onClick={() => onDuplicate(block.id)}
        >
          📋
        </button>
        <button
          type="button"
          className="action-btn"
          disabled={isFirst}
          title="Di chuyển lên"
          onClick={() => onMoveUp(block.id)}
        >
          ▲
        </button>
        <button
          type="button"
          className="action-btn"
          disabled={isLast}
          title="Di chuyển xuống"
          onClick={() => onMoveDown(block.id)}
        >
          ▼
        </button>
        <button
          type="button"
          className="action-btn danger"
          title="Xóa khối này"
          onClick={() => onDelete(block.id)}
        >
          🗑
        </button>
      </div>
    </div>
  )
}
