import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createUploadHandler } from '../netlify/functions/upload-image.mjs'
import { MAX_IMAGE_BYTES, validateImageFile } from '../src/uploadPolicy.js'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=', 'base64')
const env = { CLOUDINARY_CLOUD_NAME: 'test-cloud', CLOUDINARY_API_KEY: 'test-key', CLOUDINARY_API_SECRET: 'test-secret' }
const assetUrl = 'https://res.cloudinary.com/test-cloud/image/upload/v1/emailmkt-ismart/test.png'
function request({ path = '/api/upload-image?slot=banner', method = 'POST', body = png, headers = {} } = {}) {
  return new Request(`https://example.test${path}`, { method, headers: { origin: 'https://example.test', 'content-type': 'image/png', ...headers }, ...(method === 'POST' ? { body } : {}) })
}
test('upload signs server-side, preserves bytes and returns only a public URL', async () => {
  const ids = []
  const handler = createUploadHandler({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.cloudinary.com/v1_1/test-cloud/image/upload')
    const form = options.body
    const params = ['folder', 'overwrite', 'public_id', 'timestamp'].map(key => `${key}=${form.get(key)}`).join('&')
    assert.equal(form.get('signature'), createHash('sha256').update(params + env.CLOUDINARY_API_SECRET).digest('hex'))
    assert.equal(form.get('api_key'), env.CLOUDINARY_API_KEY)
    assert.equal(form.get('folder'), 'emailmkt-ismart')
    assert.equal(form.get('overwrite'), 'false')
    assert.match(form.get('public_id'), /^banner-[a-f0-9-]+$/)
    ids.push(form.get('public_id'))
    assert.deepEqual(Buffer.from(await form.get('file').arrayBuffer()), png)
    return Response.json({ secure_url: assetUrl, internal: 'not public' })
  } })
  for (let i = 0; i < 2; i++) {
    const response = await handler(request())
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), { url: assetUrl })
  }
  assert.notEqual(ids[0], ids[1])
})
test('invalid requests never reach Cloudinary', async () => {
  const handler = createUploadHandler({ env, fetchImpl: () => { assert.fail('unexpected upload') } })
  const cases = [
    [{ method: 'GET' }, 405],
    [{ path: '/.netlify/functions/upload-image?slot=banner' }, 404],
    [{ headers: { origin: 'https://other.test' } }, 403],
    [{ path: '/api/upload-image?slot=unknown' }, 400],
    [{ headers: { 'content-type': 'image/svg+xml' } }, 415],
    [{ headers: { 'content-type': 'image/jpeg' } }, 415],
    [{ body: Buffer.alloc(0) }, 415],
    [{ headers: { 'content-length': String(MAX_IMAGE_BYTES + 1) } }, 413],
    [{ body: Buffer.alloc(MAX_IMAGE_BYTES + 1) }, 413],
  ]
  for (const [input, status] of cases) assert.equal((await handler(request(input))).status, status)
  assert.equal((await createUploadHandler({ env: {}, fetchImpl: () => assert.fail() })(request())).status, 503)
})
test('provider errors and invalid URLs are sanitized', async () => {
  for (const [upstream, expected] of [[400, 422], [401, 502], [403, 502], [429, 429], [500, 502]]) {
    const response = await createUploadHandler({ env, fetchImpl: async () => Response.json({ error: env.CLOUDINARY_API_SECRET }, { status: upstream }) })(request())
    assert.equal(response.status, expected)
    assert.ok(!(await response.text()).includes(env.CLOUDINARY_API_SECRET))
  }
  for (const url of ['http://res.cloudinary.com/test-cloud/image/upload/a.png', 'https://evil.test/a.png', 'https://res.cloudinary.com/other/image/upload/a.png', 'invalid']) {
    assert.equal((await createUploadHandler({ env, fetchImpl: async () => Response.json({ secure_url: url }) })(request())).status, 502)
  }
  assert.equal((await createUploadHandler({ env, fetchImpl: async () => { throw new Error('private error') } })(request())).status, 502)
})
test('browser policy accepts supported images and rejects empty or oversized files', () => {
  assert.equal(validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES }), '')
  assert.ok(validateImageFile({ type: 'image/svg+xml', size: 50 }))
  assert.ok(validateImageFile({ type: 'image/png', size: 0 }))
  assert.ok(validateImageFile({ type: 'image/png', size: MAX_IMAGE_BYTES + 1 }))
})
