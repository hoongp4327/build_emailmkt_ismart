import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createUploadHandler } from './netlify/functions/upload-image.mjs'

function uploadApiDevPlugin() {
  return {
    name: 'upload-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/upload-image')) {
          return next()
        }

        const env = { ...process.env, ...loadEnv('development', process.cwd(), '') }
        const hasCloudinary =
          Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)

        if (hasCloudinary) {
          try {
            const origin = `http://${req.headers.host || 'localhost:5173'}`
            const fullUrl = new URL(req.url, origin).href
            const chunks = []
            for await (const chunk of req) {
              chunks.push(chunk)
            }
            const bodyBuffer = Buffer.concat(chunks)

            const request = new Request(fullUrl, {
              method: req.method,
              headers: {
                ...req.headers,
                origin,
              },
              body: bodyBuffer.length ? bodyBuffer : undefined,
              duplex: 'half',
            })

            const handler = createUploadHandler({ env })
            const response = await handler(request)
            res.statusCode = response.status
            response.headers.forEach((val, key) => res.setHeader(key, val))
            const data = await response.text()
            res.end(data)
            return
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message || 'Lỗi server dev' }))
            return
          }
        }

        // Báo lỗi rõ ràng khi chưa cấu hình Cloudinary env trên máy local
        if (req.method === 'POST') {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error:
                'Chưa cấu hình API Cloudinary trên máy. Vui lòng tạo file .env chứa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET để upload ảnh.',
            })
          )
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), uploadApiDevPlugin()],
  base: './',
})
