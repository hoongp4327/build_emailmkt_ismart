import { createHash, randomUUID } from 'node:crypto'
import { MAX_IMAGE_BYTES, IMAGE_TYPES, IMAGE_KINDS, UPLOAD_PATH } from '../../src/uploadPolicy.js'

const json = (status, body, headers = {}) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
})

function detectImageType(bytes) {
  if (bytes.length < 12) return null
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

async function readLimitedBody(request) {
  const reader = request.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(Buffer.from(value))
    }
    return Buffer.concat(chunks, size)
  } finally {
    reader.releaseLock()
  }
}

// Dependencies can be injected in tests; production secrets are read at request time.
export function createUploadHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async (request) => {
    const url = new URL(request.url)
    // Block the default function URL from bypassing rate limiting on the custom path.
    if (url.pathname !== UPLOAD_PATH) return json(404, { error: 'Không tìm thấy đường dẫn tải ảnh.' })
    if (request.method !== 'POST') return json(405, { error: 'Yêu cầu không hợp lệ.' }, { Allow: 'POST' })
    if (request.headers.get('origin') !== url.origin) return json(403, { error: 'Vui lòng tải ảnh từ trang Email Builder.' })

    const kind = url.searchParams.get('kind') || url.searchParams.get('slot')
    if (!IMAGE_KINDS.includes(kind)) return json(400, { error: 'Loại ảnh không hợp lệ.' })
    const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (!IMAGE_TYPES.includes(contentType)) return json(415, { error: 'Chỉ hỗ trợ ảnh JPG, PNG và WebP.' })
    if (Number(request.headers.get('content-length')) > MAX_IMAGE_BYTES) return json(413, { error: 'Ảnh vượt quá 4 MB.' })

    const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim()
    const apiKey = env.CLOUDINARY_API_KEY?.trim()
    const apiSecret = env.CLOUDINARY_API_SECRET?.trim()
    if (!cloudName || !apiKey || !apiSecret || !/^[a-zA-Z0-9_-]+$/.test(cloudName)) {
      return json(503, { error: 'Tải ảnh chưa được cấu hình. Vui lòng liên hệ quản trị viên hoặc dán link ảnh.' })
    }

    let bytes
    try { bytes = await readLimitedBody(request) } catch { return json(400, { error: 'Không đọc được file. Vui lòng chọn lại ảnh.' }) }
    if (!bytes) return json(413, { error: 'Ảnh vượt quá 4 MB.' })
    if (!bytes.length || detectImageType(bytes) !== contentType) return json(415, { error: 'File không phải ảnh JPG, PNG hoặc WebP hợp lệ.' })

    const params = {
      folder: `emailmkt-ismart/${kind}`,
      overwrite: 'false',
      public_id: `${kind}-${randomUUID()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
    }
    const signatureInput = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&')
    const signature = createHash('sha256').update(signatureInput + apiSecret).digest('hex')
    const form = new FormData()
    for (const [key, value] of Object.entries(params)) form.append(key, value)
    form.append('api_key', apiKey)
    form.append('signature', signature)
    form.append('signature_algorithm', 'sha256')
    form.append('file', new Blob([bytes], { type: contentType }), `${kind}.${contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1]}`)

    try {
      const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
      const response = await fetchImpl(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
        },
        body: form,
        signal: AbortSignal.timeout(25000),
      })
      if (!response.ok) {
        if (process.env.NODE_ENV !== 'production') {
          const errText = await response.clone().text().catch(() => '')
          console.error('[Cloudinary upload failed]:', response.status, errText)
        }
        if (response.status === 401 || response.status === 403) return json(502, { error: 'Không kết nối được kho ảnh. Quản trị viên cần kiểm tra cấu hình Cloudinary (API Key / Secret).' })
        if (response.status === 429) return json(429, { error: 'Kho ảnh đang bận. Vui lòng thử lại sau một phút.' })
        if (response.status === 400) return json(422, { error: 'Kho ảnh không nhận được file này. Vui lòng thử một ảnh JPG hoặc PNG khác.' })
        return json(502, { error: 'Chưa tải được ảnh lên kho lưu trữ. Vui lòng thử lại sau.' })
      }
      const asset = await response.json()
      const secureUrl = new URL(asset.secure_url)
      if (secureUrl.protocol !== 'https:' || secureUrl.hostname !== 'res.cloudinary.com' || !secureUrl.pathname.startsWith(`/${cloudName}/image/upload/`)) {
        return json(502, { error: 'Kho ảnh trả về đường dẫn không hợp lệ.' })
      }
      return json(200, { url: secureUrl.href })
    } catch {
      // Never expose Cloudinary responses, signatures, or credentials in errors/logs.
      return json(502, { error: 'Kết nối kho ảnh bị gián đoạn. Vui lòng kiểm tra mạng và thử lại.' })
    }
  }
}

export default createUploadHandler()

export const config = {
  path: '/api/upload-image',
  rateLimit: { windowLimit: 12, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
