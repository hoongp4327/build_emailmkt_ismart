import React from 'react'
import { ImagePicker } from './editor/image/index.js'

export default function ImageUploadField({
  slot = 'image',
  kind,
  label,
  value,
  onChange,
  onBusyChange,
}) {
  const actualKind = kind || (slot === 'mascot' ? 'qr' : slot === 'benefit' ? 'image' : slot || 'image')

  return (
    <ImagePicker
      value={value}
      onChange={(url) => onChange?.(slot, url)}
      kind={actualKind}
      label={label}
      onBusyChange={(isBusy) => onBusyChange?.(slot, isBusy)}
    />
  )
}
