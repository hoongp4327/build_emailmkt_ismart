import React, { useState } from 'react'
import { ColorField } from './SettingsInspector.jsx'
import ImageUploadField from '../../ImageUploadField.jsx'
import { ImagePicker } from '../image/index.js'
import { htmlToText, textToHtml } from '../textFormat.js'
import { createBlock, BRAND_COLORS } from '../../model/defaults.js'
import { RichTextField } from '../richText/index.js'

function CommonStyleFields({ style = {}, onChangeStyle }) {
  function update(key, value) {
    onChangeStyle({ ...style, [key]: value })
  }

  return (
    <div className="inspector-style-section">
      <h4 className="section-title">Khoảng cách &amp; Căn lề</h4>
      <div className="field-grid-3">
        <div className="inspector-field">
          <label>Đệm trên (px)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={style.paddingTop ?? 20}
            onChange={(e) => update('paddingTop', Number(e.target.value))}
          />
        </div>
        <div className="inspector-field">
          <label>Đệm dưới (px)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={style.paddingBottom ?? 20}
            onChange={(e) => update('paddingBottom', Number(e.target.value))}
          />
        </div>
        <div className="inspector-field">
          <label>Đệm ngang (px)</label>
          <input
            type="number"
            min={0}
            max={60}
            value={style.paddingX ?? 34}
            onChange={(e) => update('paddingX', Number(e.target.value))}
          />
        </div>
      </div>
      <div className="inspector-field">
        <label>Căn lề</label>
        <div className="btn-group">
          {[['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải'], ['justify', 'Đều']].map(([align, label]) => (
            <button
              key={align}
              type="button"
              className={style.align === align ? 'active' : ''}
              onClick={() => update('align', align)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Inspector cho từng loại block cụ thể (tuân thủ Phase 2: text <-> html với **đậm**).
 */
export function BlockInspectors({
  block,
  onChangeProps,
  onChangeStyle,
  onBusyChange,
}) {
  const p = block.props || {}
  const style = block.style || {}

  // State quản lý breadcrumb duyệt khối con bên trong container (Ràng buộc 3)
  const [navStack, setNavStack] = useState([])

  function updateProp(key, value) {
    onChangeProps({ ...p, [key]: value })
  }

  // --- RENDER FORM TỪNG BLOCK RIÊNG BIỆT ---

  // 1. Heading
  if (block.type === 'heading') {
    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Nội dung tiêu đề</label>
          <RichTextField
            value={p.html || ''}
            singleLine={true}
            placeholder="Nhập tiêu đề..."
            onChange={(newHtml) => updateProp('html', newHtml)}
          />
        </div>
        <div className="inspector-field">
          <label>Cấp độ tiêu đề</label>
          <div className="btn-group">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                type="button"
                className={(p.level || 2) === level ? 'active' : ''}
                onClick={() => updateProp('level', level)}
              >
                Cấp {level}
              </button>
            ))}
          </div>
        </div>
        <div className="inspector-field">
          <label>Cỡ chữ (px)</label>
          <input
            type="number"
            min={12}
            max={36}
            value={p.fontSize || (p.level === 1 ? 22 : p.level === 2 ? 19 : 16)}
            onChange={(e) => updateProp('fontSize', Number(e.target.value))}
          />
        </div>
        <ColorField
          label="Màu chữ tiêu đề"
          value={p.color || BRAND_COLORS.navy}
          onChange={(val) => updateProp('color', val)}
        />
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 2. Text
  if (block.type === 'text') {
    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Nội dung văn bản</label>
          <RichTextField
            value={p.html || ''}
            singleLine={false}
            placeholder="Dán hoặc gõ văn bản tại đây..."
            onChange={(newHtml) => updateProp('html', newHtml)}
          />
        </div>
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 3. List
  if (block.type === 'list') {
    const items = p.items || []

    function updateItemText(idx, html) {
      const nextItems = [...items]
      nextItems[idx] = { html }
      updateProp('items', nextItems)
    }

    function addItem() {
      updateProp('items', [...items, { html: '<p>Mục mới</p>' }])
    }

    function removeItem(idx) {
      updateProp('items', items.filter((_, i) => i !== idx))
    }

    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Biểu tượng đầu dòng (Marker)</label>
          <div className="btn-group">
            {['📌', '✓', '•', '⏰', '☎', '👉'].map((m) => (
              <button
                key={m}
                type="button"
                className={p.marker === m ? 'active' : ''}
                onClick={() => updateProp('marker', m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <ColorField
          label="Màu biểu tượng"
          value={p.markerColor || BRAND_COLORS.orange}
          onChange={(val) => updateProp('markerColor', val)}
        />
        <div className="inspector-field">
          <label>Các mục trong danh sách ({items.length})</label>
          <div className="sub-items-list">
            {items.map((item, idx) => (
              <div key={idx} className="sub-item-row">
                <div className="sub-item-editor">
                  <RichTextField
                    value={item.html || ''}
                    singleLine={true}
                    placeholder="Nội dung mục..."
                    onChange={(newHtml) => updateItemText(idx, newHtml)}
                  />
                </div>
                <button
                  type="button"
                  className="icon-btn-danger"
                  title="Xóa mục này"
                  onClick={() => removeItem(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="button secondary compact mt-2" onClick={addItem}>
            + Thêm mục
          </button>
        </div>
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 4. Image
  if (block.type === 'image') {
    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Hình ảnh</label>
          <ImagePicker
            key={block.id}
            value={p.src || ''}
            onChange={(url) => updateProp('src', url)}
            kind="image"
            label="Khối ảnh"
            onBusyChange={(busy) => onBusyChange?.(block.id, busy)}
            isSelectedBlock={true}
          />
        </div>

        <div className="inspector-field">
          <label>Mô tả ảnh (Alt text - bảo vệ độ tin cậy email)</label>
          <input
            type="text"
            value={p.alt || ''}
            placeholder="Mô tả nội dung bức ảnh..."
            onChange={(e) => updateProp('alt', e.target.value)}
          />
          {!p.alt?.trim() && (
            <span className="field-warning-hint">
              ⚠️ Thiếu mô tả ảnh (alt text) có thể làm giảm độ tin cậy của email.
            </span>
          )}
        </div>

        <div className="inspector-field">
          <label>Kích thước ảnh</label>
          <div className="btn-group">
            {[
              ['full', 'Tràn viền (640px)'],
              ['480', 'Lớn (480px)'],
              ['320', 'Vừa (320px)'],
              ['180', 'Nhỏ (180px)'],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={String(p.width) === val ? 'active' : ''}
                onClick={() => updateProp('width', val === 'full' ? 'full' : Number(val))}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="custom-width-row mt-1">
            <span className="sub-label">Hoặc nhập chiều rộng (px, tối đa 640):</span>
            <input
              type="number"
              min={40}
              max={640}
              value={p.width === 'full' ? 640 : (Number(p.width) || 640)}
              onChange={(e) => {
                const val = Math.min(640, Math.max(40, Number(e.target.value) || 40))
                updateProp('width', val)
              }}
            />
          </div>
        </div>

        <div className="inspector-field">
          <label>Bo góc ảnh ({p.radius ?? 0}px)</label>
          <input
            type="range"
            min={0}
            max={24}
            value={p.radius ?? 0}
            onChange={(e) => updateProp('radius', Number(e.target.value))}
          />
        </div>

        <div className="inspector-field">
          <label>Liên kết khi click vào ảnh (tùy chọn)</label>
          <input
            type="url"
            value={p.link || ''}
            placeholder="https://..."
            onChange={(e) => updateProp('link', e.target.value)}
          />
        </div>

        <div className="inspector-field">
          <label>Chú thích dưới ảnh (Caption)</label>
          <input
            type="text"
            value={p.caption || ''}
            placeholder="Ghi chú ảnh..."
            onChange={(e) => updateProp('caption', e.target.value)}
          />
        </div>

        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 5. Button
  if (block.type === 'button') {
    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Chữ trên nút (Label)</label>
          <RichTextField
            value={p.label || ''}
            singleLine={true}
            placeholder="Chữ trên nút..."
            onChange={(newHtml) => updateProp('label', newHtml)}
          />
        </div>
        <div className="inspector-field">
          <label>Đường dẫn liên kết (URL)</label>
          <input
            type="url"
            value={p.url || ''}
            placeholder="https://..."
            onChange={(e) => updateProp('url', e.target.value)}
          />
        </div>
        <div className="inspector-field">
          <label>Kiểu nút</label>
          <div className="btn-group">
            {[['outline', 'Viền rỗng (Outline)'], ['solid', 'Tô đặc (Solid)']].map(([variant, label]) => (
              <button
                key={variant}
                type="button"
                className={(p.variant || 'outline') === variant ? 'active' : ''}
                onClick={() => updateProp('variant', variant)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="inspector-field">
          <label>Căn nút</label>
          <div className="btn-group">
            {[['left', 'Trái'], ['center', 'Giữa'], ['right', 'Phải']].map(([align, label]) => (
              <button
                key={align}
                type="button"
                className={(p.align || 'center') === align ? 'active' : ''}
                onClick={() => updateProp('align', align)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ColorField
          label="Màu nút"
          value={p.color || BRAND_COLORS.blue}
          onChange={(val) => updateProp('color', val)}
        />
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 6. Payment (Chuyển khoản QR)
  if (block.type === 'payment') {
    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Tiêu đề khối</label>
          <RichTextField
            value={p.title || 'THÔNG TIN CHUYỂN KHOẢN'}
            singleLine={true}
            placeholder="THÔNG TIN CHUYỂN KHOẢN"
            onChange={(newHtml) => updateProp('title', newHtml)}
          />
        </div>
        <div className="inspector-field">
          <label>Tên ngân hàng</label>
          <input
            type="text"
            value={p.bankName || ''}
            placeholder="VD: Vietcombank, MB Bank..."
            onChange={(e) => updateProp('bankName', e.target.value)}
          />
        </div>
        <div className="inspector-field">
          <label>Số tài khoản (hiển thị nguyên văn khi copy)</label>
          <input
            type="text"
            value={p.accountNo || ''}
            placeholder="VD: 0123456789"
            onChange={(e) => updateProp('accountNo', e.target.value)}
          />
          <span className="field-hint">Số tài khoản được giữ nguyên văn để người nhận copy dán vào app ngân hàng.</span>
        </div>
        <div className="inspector-field">
          <label>Chủ tài khoản (In hoa)</label>
          <input
            type="text"
            value={p.accountName || ''}
            placeholder="CONG TY CO PHAN ISMART"
            onChange={(e) => updateProp('accountName', e.target.value)}
          />
        </div>
        <div className="inspector-field">
          <label>Số tiền (VNĐ - tùy chọn)</label>
          <input
            type="number"
            value={p.amount || ''}
            placeholder="Để trống nếu không cố định số tiền"
            onChange={(e) => updateProp('amount', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
        <div className="inspector-field">
          <label>Nội dung chuyển khoản</label>
          <input
            type="text"
            value={p.transferContent || ''}
            placeholder="HOTEN_LOP_SDT"
            onChange={(e) => updateProp('transferContent', e.target.value)}
          />
        </div>
        <div className="inspector-field">
          <label>Mã QR thanh toán</label>
          <ImagePicker
            key={block.id}
            value={p.qrImageUrl || ''}
            onChange={(url) => updateProp('qrImageUrl', url)}
            kind="qr"
            label="Ảnh mã QR"
            onBusyChange={(busy) => onBusyChange?.(block.id, busy)}
            isSelectedBlock={true}
          />
        </div>
        <div className="inspector-field">
          <label>Ghi chú thanh toán (nếu có)</label>
          <RichTextField
            value={p.note || ''}
            singleLine={false}
            placeholder="Vui lòng kiểm tra kỹ nội dung..."
            onChange={(newHtml) => updateProp('note', newHtml)}
          />
        </div>
        <ColorField
          label="Màu tiêu đề thẻ"
          value={p.accentColor || BRAND_COLORS.navy}
          onChange={(val) => updateProp('accentColor', val)}
        />
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 7. Divider
  if (block.type === 'divider') {
    return (
      <div className="inspector-form">
        <ColorField
          label="Màu đường kẻ"
          value={p.color || '#d4e9f8'}
          onChange={(val) => updateProp('color', val)}
        />
        <div className="inspector-field">
          <label>Độ dày (px)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={p.thickness || 1}
            onChange={(e) => updateProp('thickness', Number(e.target.value))}
          />
        </div>
        <div className="inspector-field">
          <label>Độ rộng ({p.widthPercent || 100}%)</label>
          <input
            type="range"
            min={20}
            max={100}
            value={p.widthPercent || 100}
            onChange={(e) => updateProp('widthPercent', Number(e.target.value))}
          />
        </div>
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 8. Spacer
  if (block.type === 'spacer') {
    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Chiều cao khoảng trống ({p.height || 20}px)</label>
          <input
            type="range"
            min={8}
            max={120}
            value={p.height || 20}
            onChange={(e) => updateProp('height', Number(e.target.value))}
          />
        </div>
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 9. Footer
  if (block.type === 'footer') {
    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Lời kêu gọi hành động cuối thư</label>
          <RichTextField
            value={p.closingLine || ''}
            singleLine={true}
            placeholder="Đăng ký ngay hôm nay..."
            onChange={(newHtml) => updateProp('closingLine', newHtml)}
          />
        </div>
        <div className="inspector-field">
          <label>Lời kết / Lời chào</label>
          <RichTextField
            value={p.signOff || ''}
            singleLine={true}
            placeholder="Trân trọng,"
            onChange={(newHtml) => updateProp('signOff', newHtml)}
          />
        </div>
        <ColorField
          label="Màu nền chân trang"
          value={p.bg || BRAND_COLORS.navy}
          onChange={(val) => updateProp('bg', val)}
        />
        <ColorField
          label="Màu chữ"
          value={p.color || '#ffffff'}
          onChange={(val) => updateProp('color', val)}
        />
        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 10. Container: InfoCard (Khối chứa có Breadcrumbs và form con - Ràng buộc 3)
  if (block.type === 'infoCard') {
    const bodyBlocks = p.bodyBlocks || []

    function updateChildBlocks(nextBlocks) {
      updateProp('bodyBlocks', nextBlocks)
    }

    function addChildBlock(type) {
      const newChild = createBlock(type, {}, { paddingX: 0, paddingTop: 4, paddingBottom: 8 })
      updateChildBlocks([...bodyBlocks, newChild])
    }

    function removeChild(idx) {
      updateChildBlocks(bodyBlocks.filter((_, i) => i !== idx))
    }

    function moveChild(fromIdx, toIdx) {
      if (toIdx < 0 || toIdx >= bodyBlocks.length) return
      const nextBlocks = [...bodyBlocks]
      const [moved] = nextBlocks.splice(fromIdx, 1)
      nextBlocks.splice(toIdx, 0, moved)
      updateChildBlocks(nextBlocks)
    }

    // Nếu đang chọn sửa 1 block con
    if (navStack.length > 0) {
      const activeChildIndex = navStack[0]
      const activeChild = bodyBlocks[activeChildIndex]

      if (!activeChild) {
        setNavStack([])
        return null
      }

      return (
        <div className="inspector-form">
          <div className="breadcrumb-nav">
            <button type="button" className="breadcrumb-link" onClick={() => setNavStack([])}>
              {p.title || 'Thẻ thông tin'}
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Khối con ({activeChild.type})</span>
          </div>

          <BlockInspectors
            block={activeChild}
            onChangeProps={(nextChildProps) => {
              const nextBlocks = [...bodyBlocks]
              nextBlocks[activeChildIndex] = { ...activeChild, props: nextChildProps }
              updateChildBlocks(nextBlocks)
            }}
            onChangeStyle={(nextChildStyle) => {
              const nextBlocks = [...bodyBlocks]
              nextBlocks[activeChildIndex] = { ...activeChild, style: nextChildStyle }
              updateChildBlocks(nextBlocks)
            }}
            onBusyChange={onBusyChange}
          />
        </div>
      )
    }

    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Tiêu đề thẻ</label>
          <RichTextField
            value={p.title || ''}
            singleLine={true}
            placeholder="Tiêu đề thẻ..."
            onChange={(newHtml) => updateProp('title', newHtml)}
          />
        </div>
        <ColorField
          label="Màu nền header"
          value={p.headerBg || BRAND_COLORS.navy}
          onChange={(val) => updateProp('headerBg', val)}
        />
        <ColorField
          label="Màu chữ header"
          value={p.headerColor || '#ffffff'}
          onChange={(val) => updateProp('headerColor', val)}
        />

        <div className="sub-blocks-section">
          <h4 className="section-title">Nội dung bên trong thẻ ({bodyBlocks.length} khối con)</h4>
          <div className="sub-blocks-list">
            {bodyBlocks.map((child, idx) => (
              <div key={child.id || idx} className="sub-block-row">
                <button
                  type="button"
                  className="sub-block-name-btn"
                  onClick={() => setNavStack([idx])}
                >
                  <span className="sub-icon">▣</span>
                  <span>{child.type} - {htmlToText(child.props?.html || child.props?.label || '').slice(0, 24) || 'Chi tiết'}</span>
                  <span className="edit-hint">Sửa ›</span>
                </button>
                <div className="sub-block-actions">
                  <button type="button" disabled={idx === 0} onClick={() => moveChild(idx, idx - 1)}>▲</button>
                  <button type="button" disabled={idx === bodyBlocks.length - 1} onClick={() => moveChild(idx, idx + 1)}>▼</button>
                  <button type="button" className="danger" onClick={() => removeChild(idx)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="btn-group mt-2">
            <button type="button" onClick={() => addChildBlock('text')}>+ Đoạn văn</button>
            <button type="button" onClick={() => addChildBlock('list')}>+ Danh sách</button>
            <button type="button" onClick={() => addChildBlock('button')}>+ Nút CTA</button>
          </div>
        </div>

        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 11. Container: ImageText (2 cột chữ + ảnh)
  if (block.type === 'imageText') {
    const contentBlocks = p.contentBlocks || []

    function updateContentBlocks(nextBlocks) {
      updateProp('contentBlocks', nextBlocks)
    }

    function addContentBlock(type) {
      const newChild = createBlock(type, {}, { paddingX: 0, paddingTop: 4, paddingBottom: 8 })
      updateContentBlocks([...contentBlocks, newChild])
    }

    function removeContentChild(idx) {
      updateContentBlocks(contentBlocks.filter((_, i) => i !== idx))
    }

    function moveContentChild(fromIdx, toIdx) {
      if (toIdx < 0 || toIdx >= contentBlocks.length) return
      const nextBlocks = [...contentBlocks]
      const [moved] = nextBlocks.splice(fromIdx, 1)
      nextBlocks.splice(toIdx, 0, moved)
      updateContentBlocks(nextBlocks)
    }

    if (navStack.length > 0) {
      const activeChildIndex = navStack[0]
      const activeChild = contentBlocks[activeChildIndex]

      if (!activeChild) {
        setNavStack([])
        return null
      }

      return (
        <div className="inspector-form">
          <div className="breadcrumb-nav">
            <button type="button" className="breadcrumb-link" onClick={() => setNavStack([])}>
              {p.alt || 'Khối 2 cột'}
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">Khối con ({activeChild.type})</span>
          </div>

          <BlockInspectors
            block={activeChild}
            onChangeProps={(nextChildProps) => {
              const nextBlocks = [...contentBlocks]
              nextBlocks[activeChildIndex] = { ...activeChild, props: nextChildProps }
              updateContentBlocks(nextBlocks)
            }}
            onChangeStyle={(nextChildStyle) => {
              const nextBlocks = [...contentBlocks]
              nextBlocks[activeChildIndex] = { ...activeChild, style: nextChildStyle }
              updateContentBlocks(nextBlocks)
            }}
            onBusyChange={onBusyChange}
          />
        </div>
      )
    }

    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Vị trí ảnh</label>
          <div className="btn-group">
            {[['left', 'Ảnh bên trái'], ['right', 'Ảnh bên phải']].map(([pos, label]) => (
              <button
                key={pos}
                type="button"
                className={(p.imagePosition || 'right') === pos ? 'active' : ''}
                onClick={() => updateProp('imagePosition', pos)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="inspector-field">
          <label>Độ rộng ảnh (px)</label>
          <input
            type="number"
            min={80}
            max={260}
            value={p.imageWidth || 132}
            onChange={(e) => updateProp('imageWidth', Number(e.target.value))}
          />
        </div>

        <div className="inspector-field">
          <label>Ảnh minh họa</label>
          <ImagePicker
            key={block.id}
            value={p.src || ''}
            onChange={(url) => updateProp('src', url)}
            kind="image"
            label="Ảnh cột bên"
            onBusyChange={(busy) => onBusyChange?.(block.id, busy)}
            isSelectedBlock={true}
          />
        </div>

        <div className="sub-blocks-section">
          <h4 className="section-title">Cột nội dung ({contentBlocks.length} khối con)</h4>
          <div className="sub-blocks-list">
            {contentBlocks.map((child, idx) => (
              <div key={child.id || idx} className="sub-block-row">
                <button
                  type="button"
                  className="sub-block-name-btn"
                  onClick={() => setNavStack([idx])}
                >
                  <span className="sub-icon">▣</span>
                  <span>{child.type} - {htmlToText(child.props?.html || child.props?.label || '').slice(0, 24) || 'Chi tiết'}</span>
                  <span className="edit-hint">Sửa ›</span>
                </button>
                <div className="sub-block-actions">
                  <button type="button" disabled={idx === 0} onClick={() => moveContentChild(idx, idx - 1)}>▲</button>
                  <button type="button" disabled={idx === contentBlocks.length - 1} onClick={() => moveContentChild(idx, idx + 1)}>▼</button>
                  <button type="button" className="danger" onClick={() => removeContentChild(idx)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="btn-group mt-2">
            <button type="button" onClick={() => addContentBlock('heading')}>+ Tiêu đề</button>
            <button type="button" onClick={() => addContentBlock('text')}>+ Đoạn văn</button>
            <button type="button" onClick={() => addContentBlock('list')}>+ Danh sách</button>
            <button type="button" onClick={() => addContentBlock('button')}>+ Nút CTA</button>
          </div>
        </div>

        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  // 12. Container: OfferCards (Khối ưu đãi có các card con)
  if (block.type === 'offerCards') {
    const cards = p.cards || []

    function updateCards(nextCards) {
      updateProp('cards', nextCards)
    }

    function addCard() {
      updateCards([...cards, { title: '📌 KHÓA HỌC MỚI', contentBlocks: [createBlock('text', { html: '<p>Nội dung ưu đãi</p>' })] }])
    }

    function removeCard(idx) {
      updateCards(cards.filter((_, i) => i !== idx))
    }

    // Nếu đang sửa 1 card con: navStack = [cardIndex] hoặc [cardIndex, blockIndex]
    if (navStack.length > 0) {
      const cardIdx = navStack[0]
      const currentCard = cards[cardIdx]

      if (!currentCard) {
        setNavStack([])
        return null
      }

      if (navStack.length === 2) {
        const blockIdx = navStack[1]
        const currentChildBlock = currentCard.contentBlocks?.[blockIdx]

        if (!currentChildBlock) {
          setNavStack([cardIdx])
          return null
        }

        return (
          <div className="inspector-form">
            <div className="breadcrumb-nav">
              <button type="button" className="breadcrumb-link" onClick={() => setNavStack([])}>
                {p.title || 'Ưu đãi'}
              </button>
              <span className="breadcrumb-separator">›</span>
              <button type="button" className="breadcrumb-link" onClick={() => setNavStack([cardIdx])}>
                {currentCard.title || `Card ${cardIdx + 1}`}
              </button>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">{currentChildBlock.type}</span>
            </div>

            <BlockInspectors
              block={currentChildBlock}
              onChangeProps={(nextChildProps) => {
                const nextCards = [...cards]
                const nextBlocks = [...currentCard.contentBlocks]
                nextBlocks[blockIdx] = { ...currentChildBlock, props: nextChildProps }
                nextCards[cardIdx] = { ...currentCard, contentBlocks: nextBlocks }
                updateCards(nextCards)
              }}
              onChangeStyle={(nextChildStyle) => {
                const nextCards = [...cards]
                const nextBlocks = [...currentCard.contentBlocks]
                nextBlocks[blockIdx] = { ...currentChildBlock, style: nextChildStyle }
                nextCards[cardIdx] = { ...currentCard, contentBlocks: nextBlocks }
                updateCards(nextCards)
              }}
              onBusyChange={onBusyChange}
            />
          </div>
        )
      }

      // Đang ở cấp độ Card: chỉnh tiêu đề card và danh sách khối trong card
      return (
        <div className="inspector-form">
          <div className="breadcrumb-nav">
            <button type="button" className="breadcrumb-link" onClick={() => setNavStack([])}>
              {p.title || 'Ưu đãi'}
            </button>
            <span className="breadcrumb-separator">›</span>
            <span className="breadcrumb-current">{currentCard.title || `Card ${cardIdx + 1}`}</span>
          </div>

          <div className="inspector-field">
            <label>Tiêu đề card</label>
            <RichTextField
              value={currentCard.title || ''}
              singleLine={true}
              placeholder="Tiêu đề card..."
              onChange={(newHtml) => {
                const nextCards = [...cards]
                nextCards[cardIdx] = { ...currentCard, title: newHtml }
                updateCards(nextCards)
              }}
            />
          </div>

          <div className="sub-blocks-section">
            <h4 className="section-title">Khối nội dung trong Card ({currentCard.contentBlocks?.length || 0})</h4>
            <div className="sub-blocks-list">
              {(currentCard.contentBlocks || []).map((b, bIdx) => (
                <div key={b.id || bIdx} className="sub-block-row">
                  <button
                    type="button"
                    className="sub-block-name-btn"
                    onClick={() => setNavStack([cardIdx, bIdx])}
                  >
                    <span className="sub-icon">▣</span>
                    <span>{b.type} - {htmlToText(b.props?.html || '').slice(0, 20) || 'Chi tiết'}</span>
                    <span className="edit-hint">Sửa ›</span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn-danger"
                    onClick={() => {
                      const nextCards = [...cards]
                      nextCards[cardIdx] = {
                        ...currentCard,
                        contentBlocks: currentCard.contentBlocks.filter((_, i) => i !== bIdx),
                      }
                      updateCards(nextCards)
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="btn-group mt-2">
              <button
                type="button"
                onClick={() => {
                  const nextCards = [...cards]
                  nextCards[cardIdx] = {
                    ...currentCard,
                    contentBlocks: [...(currentCard.contentBlocks || []), createBlock('text', { html: '<p>Đoạn văn mới</p>' })],
                  }
                  updateCards(nextCards)
                }}
              >
                + Đoạn văn
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextCards = [...cards]
                  nextCards[cardIdx] = {
                    ...currentCard,
                    contentBlocks: [...(currentCard.contentBlocks || []), createBlock('list', { items: [{ html: 'Mục ưu đãi' }], marker: '✓' })],
                  }
                  updateCards(nextCards)
                }}
              >
                + Danh sách
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="inspector-form">
        <div className="inspector-field">
          <label>Tiêu đề khối ưu đãi</label>
          <RichTextField
            value={p.title || ''}
            singleLine={true}
            placeholder="Tiêu đề khối ưu đãi..."
            onChange={(newHtml) => updateProp('title', newHtml)}
          />
        </div>
        <div className="inspector-field">
          <label>Phụ đề / dòng nhấn mạnh</label>
          <RichTextField
            value={p.subtitle || ''}
            singleLine={true}
            placeholder="Phụ đề..."
            onChange={(newHtml) => updateProp('subtitle', newHtml)}
          />
        </div>

        <div className="sub-blocks-section">
          <h4 className="section-title">Danh sách các card ưu đãi ({cards.length})</h4>
          <div className="sub-blocks-list">
            {cards.map((c, idx) => (
              <div key={idx} className="sub-block-row">
                <button
                  type="button"
                  className="sub-block-name-btn"
                  onClick={() => setNavStack([idx])}
                >
                  <span className="sub-icon">🏷</span>
                  <span>{c.title || `Card ${idx + 1}`}</span>
                  <span className="edit-hint">Mở card ›</span>
                </button>
                <button
                  type="button"
                  className="icon-btn-danger"
                  onClick={() => removeCard(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="button secondary compact mt-2" onClick={addCard}>
            + Thêm thẻ con (Card)
          </button>
        </div>

        <CommonStyleFields style={style} onChangeStyle={onChangeStyle} />
      </div>
    )
  }

  return <div>Chọn khối để chỉnh sửa</div>
}
