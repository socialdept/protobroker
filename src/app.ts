import { type Context, Hono } from 'hono'
import { isAllowedHost, parseAllowedHosts } from './allowlist'
import { BlobError, type ClientBlob, decodeBlob } from './blob'
import { landingPage } from './landing'
import { buildMetadata } from './metadata'

/**
 * Portable config shared by the Worker and the Bun server. Both are plain
 * string settings, so the same app runs on either.
 */
export type Bindings = {
  ALLOWED_CALLBACK_HOSTS?: string
  PUBLIC_URL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => c.html(landingPage(publicOrigin(c.req.url, c.env?.PUBLIC_URL))))

app.get('/health', (c) => c.json({ ok: true }))

app.get('/v1/:blob', async (c) => {
  const url = new URL(c.req.url)

  // The client_id is this exact URL, so a query string would make the
  // document disagree with the id the authorization server fetched.
  if (url.search) {
    return invalid(c, 'Client metadata URLs must not have a query string')
  }

  const blob = resolveBlob(c.req.param('blob'), c.env?.ALLOWED_CALLBACK_HOSTS)

  if (blob instanceof BlobError) return invalid(c, blob.message)

  const clientId = `${publicOrigin(c.req.url, c.env?.PUBLIC_URL)}/v1/${c.req.param('blob')}`

  try {
    const metadata = await buildMetadata(clientId, blob)

    return c.json(metadata, 200, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    })
  } catch (error) {
    if (error instanceof BlobError) return invalid(c, error.message)

    throw error
  }
})

app.get('/v1/:blob/callback', (c) => {
  const blob = resolveBlob(c.req.param('blob'), c.env?.ALLOWED_CALLBACK_HOSTS)

  if (blob instanceof BlobError) return invalid(c, blob.message)

  const target = new URL(blob.callback)

  for (const [name, value] of new URL(c.req.url).searchParams) {
    target.searchParams.set(name, value)
  }

  return c.body(null, 302, {
    Location: target.toString(),
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
  })
})

app.notFound((c) => c.json({ error: 'NotFound', message: 'Not found' }, 404))

app.onError((error, c) => {
  console.error(JSON.stringify({ message: 'Unhandled error', error: String(error), path: new URL(c.req.url).pathname }))

  return c.json({ error: 'InternalServerError', message: 'Something went wrong' }, 500)
})

export default app

function resolveBlob(encoded: string, allowedHosts: string | undefined): ClientBlob | BlobError {
  try {
    const blob = decodeBlob(encoded)
    const { hostname } = new URL(blob.callback)

    if (!isAllowedHost(hostname, parseAllowedHosts(allowedHosts))) {
      return new BlobError(`Callback host "${hostname}" is not allowed on this broker`)
    }

    return blob
  } catch (error) {
    if (error instanceof BlobError) return error

    throw error
  }
}

/**
 * The origin client ids are minted under. Behind a proxy the request origin
 * can differ from the public one, so PUBLIC_URL wins when set.
 */
function publicOrigin(requestUrl: string, publicUrl: string | undefined): string {
  return publicUrl?.trim() ? publicUrl.trim().replace(/\/+$/, '') : new URL(requestUrl).origin
}

function invalid(c: Context, message: string): Response {
  return c.json({ error: 'InvalidClient', message }, 400)
}
