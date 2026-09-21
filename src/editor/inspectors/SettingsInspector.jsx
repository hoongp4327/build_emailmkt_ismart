import React from 'react'
import { BRAND_COLORS, SAFE_FONTS } from '../../model/defaults.js'

const PALETTE_SWATCHES = [
  { label: 'Navy', hex: BRAND_COLORS.navy },
  { label: 'Blue', hex: BRAND_COLORS.blue },
  { label: 'Orange', hex: BRAND_COLORS.orange },
  { label: 'Lime', hex: BRAND_COLORS.lime },
  { label: 'Text', hex: BRAND_COLORS.text },
  { label: 'Pale', hex: BRAND_COLORS.pale },
  { label: 'Trắng', hex: '#ffffff' },
  { label: 'Đen', hex: '#000000' },
]

export function ColorField({ label, value = '', onChange }) {
  function handleHexChange(e) {
    let val = e.target.value.trim()
    if (!val.startsWith('#')) val = '#' + val
    if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
      onChange(val)
    }
  }

  return (
    <div className="inspector-field">
      <label>{label}</label>
      <div className="color-field-row">
        <input
          type="text"
          className="color-hex-input"
          value={value}
          maxLength={7}
          placeholder="#082e6f"
          onChange={handleHexChange}
        />
        <span className="color-preview-box" style={{ background: value || 'transparent' }} />
      </div>
      <div className="swatches-row">
        {PALETTE_SWATCHES.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            className={`swatch-btn ${value.toLowerCase() === swatch.hex.toLowerCase() ? 'active' : ''}`}
            style={{ background: swatch.hex }}
            title={`${swatch.label} (${swatch.hex})`}
            onClick={() => onChange(swatch.hex)}
          />
        ))}
      </div>
    </div>
  )
}

export function SettingsInspector({ settings = {}, onChangeSettings }) {
  function update(key, value) {
    onChangeSettings({
      ...settings,
      [key]: value,
    })
  }

  return (
    <div className="inspector-form">
      <div className="inspector-header">
        <h3>Cài đặt chung email</h3>
        <p className="inspector-sub">Cấu hình kích thước và kiểu dáng tổng thể</p>
      </div>

      <div className="inspector-field">
        <label>Chiều rộng email</label>
        <select
          value={settings.width || 640}
          onChange={(e) => update('width', Number(e.target.value))}
        >
          <option value={640}>640px (Chuẩn tối ưu Gmail)</option>
          <option value={600}>600px (Chuẩn truyền thống)</option>
        </select>
        <span className="field-hint">Khóa cố định ở 600px hoặc 640px để chống vỡ layout trên Gmail.</span>
      </div>

      <div className="inspector-field">
        <label>Font chữ hệ thống (Web-safe)</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => update('fontFamily', e.target.value)}
        >
          {SAFE_FONTS.map((font) => (
            <option key={font} value={font}>
              {font.split(',')[0].replaceAll("'", '')}
            </option>
          ))}
        </select>
        <span className="field-hint">Email chỉ dùng font hệ thống để hiển thị đúng trong Gmail/Outlook.</span>
      </div>

      <div className="inspector-field">
        <label>Bo góc khung email ({settings.radius || 22}px)</label>
        <input
          type="range"
          min={0}
          max={32}
          value={settings.radius ?? 22}
          onChange={(e) => update('radius', Number(e.target.value))}
        />
      </div>

      <ColorField
        label="Màu nền bên ngoài"
        value={settings.outerBg || '#eef7fc'}
        onChange={(val) => update('outerBg', val)}
      />

      <ColorField
        label="Màu nền nội dung email"
        value={settings.contentBg || '#ffffff'}
        onChange={(val) => update('contentBg', val)}
      />
    </div>
  )
}
