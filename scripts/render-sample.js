import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderEmail } from '../src/render/renderEmail.js'
import { buildEmail } from '../src/emailTemplate.js'
import { DEFAULT_CONTENT, DEFAULT_IMAGES } from '../src/defaultContent.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distSampleDir = path.join(rootDir, 'dist-sample')

if (!fs.existsSync(distSampleDir)) {
  fs.mkdirSync(distSampleDir, { recursive: true })
}

// 1. Đọc và render v2 từ ilead-offer.json
const templatePath = path.join(rootDir, 'src', 'templates', 'ilead-offer.json')
const templateDoc = JSON.parse(fs.readFileSync(templatePath, 'utf8'))
const v2Result = renderEmail(templateDoc)

fs.writeFileSync(path.join(distSampleDir, 'ilead.html'), v2Result.document, 'utf8')
console.log('✓ Đã xuất dist-sample/ilead.html (v2)')

// 2. Render v1 từ buildEmail cũ
const v1Result = buildEmail(DEFAULT_CONTENT, DEFAULT_IMAGES)
fs.writeFileSync(path.join(distSampleDir, 'v1.html'), v1Result.document, 'utf8')
console.log('✓ Đã xuất dist-sample/v1.html (v1)')

// 3. Tạo dist-sample/compare.html hiển thị v1 và v2 cạnh nhau
const compareHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>So sánh hiển thị Email: v1 vs v2</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c1726; color: #f0f4f8; }
    header { padding: 14px 24px; background: #132238; border-bottom: 1px solid #233b5d; display: flex; justify-content: space-between; align-items: center; }
    h1 { font-size: 18px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 10px; }
    .badge { font-size: 11px; padding: 3px 8px; border-radius: 999px; background: #0870c5; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; }
    .controls { display: flex; gap: 10px; align-items: center; }
    button { padding: 6px 14px; border-radius: 6px; border: 1px solid #32537d; background: #1c314f; color: #e2eaf4; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s; }
    button:hover { background: #26436b; color: #fff; }
    button.active { background: #0870c5; border-color: #0870c5; color: #fff; }
    .container { display: flex; gap: 16px; padding: 16px; height: calc(100vh - 61px); }
    .column { flex: 1; display: flex; flex-direction: column; background: #14243b; border-radius: 12px; border: 1px solid #233b5d; overflow: hidden; }
    .column-header { padding: 10px 16px; background: #182d49; border-bottom: 1px solid #233b5d; display: flex; justify-content: space-between; align-items: center; }
    .column-title { font-size: 14px; font-weight: 600; color: #d6e4f0; }
    .column-tag { font-size: 11px; color: #8faec8; }
    .frame-wrapper { flex: 1; display: flex; justify-content: center; align-items: flex-start; padding: 16px; overflow: auto; background: #0b1523; }
    iframe { border: 0; width: 640px; height: 100%; min-height: 850px; background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); transition: width 0.2s; }
    body.mobile iframe { width: 375px; }
  </style>
</head>
<body>
  <header>
    <h1><span>iSMART Email Builder</span><span class="badge">Phase 1 Parity Check</span></h1>
    <div class="controls">
      <span style="font-size: 13px; color: #8faec8; margin-right: 4px;">Kích thước hiển thị:</span>
      <button id="btn-desktop" class="active" onclick="setMode('desktop')">Máy tính (640px)</button>
      <button id="btn-mobile" onclick="setMode('mobile')">Điện thoại (375px)</button>
    </div>
  </header>
  <div class="container">
    <div class="column">
      <div class="column-header">
        <span class="column-title">Bản v1 cũ (buildEmail)</span>
        <span class="column-tag">Text thô &rarr; Dò từ khóa</span>
      </div>
      <div class="frame-wrapper">
        <iframe src="v1.html" title="Bản v1 cũ"></iframe>
      </div>
    </div>
    <div class="column">
      <div class="column-header">
        <span class="column-title">Bản v2 mới (Block Model &amp; Pure Renderer)</span>
        <span class="column-tag">JSON blocks &rarr; Pure function</span>
      </div>
      <div class="frame-wrapper">
        <iframe src="ilead.html" title="Bản v2 mới"></iframe>
      </div>
    </div>
  </div>
  <script>
    function setMode(mode) {
      if (mode === 'mobile') {
        document.body.classList.add('mobile');
        document.getElementById('btn-mobile').classList.add('active');
        document.getElementById('btn-desktop').classList.remove('active');
      } else {
        document.body.classList.remove('mobile');
        document.getElementById('btn-desktop').classList.add('active');
        document.getElementById('btn-mobile').classList.remove('active');
      }
    }
  </script>
</body>
</html>`

fs.writeFileSync(path.join(distSampleDir, 'compare.html'), compareHtml, 'utf8')
console.log('✓ Đã xuất dist-sample/compare.html (So sánh song song v1 & v2)')
