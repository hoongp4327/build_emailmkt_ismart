import React from 'react'
import { SettingsInspector } from './inspectors/SettingsInspector.jsx'
import { BlockInspectors } from './inspectors/BlockInspectors.jsx'
import { RichTextToolbar, ActiveEditorProvider } from './richText/index.js'

const BLOCK_TITLES = {
  heading: 'Chỉnh sửa Tiêu đề',
  text: 'Chỉnh sửa Đoạn văn',
  image: 'Chỉnh sửa Hình ảnh',
  list: 'Chỉnh sửa Danh sách',
  infoCard: 'Chỉnh sửa Thẻ thông tin',
  imageText: 'Chỉnh sửa Khối 2 cột',
  offerCards: 'Chỉnh sửa Khối ưu đãi',
  button: 'Chỉnh sửa Nút bấm',
  payment: 'Chỉnh sửa Chuyển khoản QR',
  divider: 'Chỉnh sửa Đường kẻ',
  spacer: 'Chỉnh sửa Khoảng trống',
  footer: 'Chỉnh sửa Chân trang',
}

export function Inspector({
  selectedBlock,
  settings,
  onChangeSettings,
  onChangeBlockProps,
  onChangeBlockStyle,
  onDeselectBlock,
  onDeleteBlock,
  onBusyChange,
}) {
  return (
    <ActiveEditorProvider>
      <aside className="inspector-panel">
        <div className="inspector-topbar">
          <div className="inspector-title-group">
            <span className="inspector-title">
              {selectedBlock ? (BLOCK_TITLES[selectedBlock.type] || 'Thuộc tính khối') : 'Cài đặt chung email'}
            </span>
            {selectedBlock && (
              <span className="block-id-tag">#{selectedBlock.id.slice(-6)}</span>
            )}
          </div>
          <div className="inspector-topbar-actions">
            {selectedBlock && (
              <>
                <button
                  type="button"
                  className="icon-action-btn danger"
                  title="Xóa khối này"
                  onClick={() => onDeleteBlock(selectedBlock.id)}
                >
                  🗑
                </button>
                <button
                  type="button"
                  className="icon-action-btn"
                  title="Đóng / Bỏ chọn (quay về cài đặt chung)"
                  onClick={onDeselectBlock}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thanh công cụ RichText dùng chung, dính ở đầu Inspector (Ràng buộc 5) */}
        {selectedBlock && <RichTextToolbar />}

        <div className="inspector-content-scroll">
          {selectedBlock ? (
            <BlockInspectors
              block={selectedBlock}
              onChangeProps={onChangeBlockProps}
              onChangeStyle={onChangeBlockStyle}
              onBusyChange={onBusyChange}
            />
          ) : (
            <SettingsInspector
              settings={settings}
              onChangeSettings={onChangeSettings}
            />
          )}
        </div>
      </aside>
    </ActiveEditorProvider>
  )
}

