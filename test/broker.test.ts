import { describe, expect, test } from 'bun:test'
import { isOAuthClientIdDiscoverable, oauthClientMetadataSchema } from '@atproto/oauth-types'
import { isAllowedHost, parseAllowedHosts } from '../src/allowlist'
import app, { type Bindings } from '../src/app'
import { BlobError, type ClientBlob, base64urlEncode, decodeBlob, encodeBlob } from '../src/blob'
import { thumbprint } from '../src/metadata'

const ORIGIN = 'https://proto.broker'

async function publicKey(): Promise<{ x: string; y: string }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)

  return { x: jwk.x!, y: jwk.y! }
}

function request(path: string, env: Bindings = {}) {
  return app.request(`${ORIGIN}${path}`, {}, env)
}

function rawBlob(wire: unknown): string {
  return base64urlEncode(new TextEncoder().encode(JSON.stringify(wire)))
}

describe('blob', () => {
  test('round-trips every field', async () => {
    const blob: ClientBlob = {
      callback: 'https://app.test/oauth/callback',
      scope: 'atproto transition:generic',
      name: 'My app ✨',
      key: await publicKey(),
      kid: 'dev-key-1',
    }

    expect(decodeBlob(encodeBlob(blob))).toEqual(blob)
  })

  test('produces unpadded base64url', () => {
    const encoded = encodeBlob({ callback: 'https://app.test/cb', scope: 'atproto' })

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  test.each([
    ['empty', ''],
    ['padded', `${encodeBlob({ callback: 'https://app.test/cb', scope: 'atproto' })}=`],
    ['not json', base64urlEncode(new TextEncoder().encode('nope'))],
    ['array', rawBlob([])],
    ['unknown field', rawBlob({ c: 'https://app.test/cb', s: 'atproto', z: 1 })],
    ['missing callback', rawBlob({ s: 'atproto' })],
    ['relative callback', rawBlob({ c: '/cb', s: 'atproto' })],
    ['ftp callback', rawBlob({ c: 'ftp://app.test/cb', s: 'atproto' })],
    ['callback with credentials', rawBlob({ c: 'https://u:p@app.test/cb', s: 'atproto' })],
    ['callback with fragment', rawBlob({ c: 'https://app.test/cb#x', s: 'atproto' })],
    ['scope without atproto', rawBlob({ c: 'https://app.test/cb', s: 'transition:generic' })],
    ['blank name', rawBlob({ c: 'https://app.test/cb', s: 'atproto', n: '  ' })],
    ['short coordinate', rawBlob({ c: 'https://app.test/cb', s: 'atproto', k: { x: 'abc', y: 'def' } })],
    ['extra key member', rawBlob({ c: 'https://app.test/cb', s: 'atproto', k: { x: 'a'.repeat(43), y: 'a'.repeat(43), d: 'secret' } })],
    ['bad kid', rawBlob({ c: 'https://app.test/cb', s: 'atproto', i: 'has space' })],
    ['too long', 'a'.repeat(2049)],
  ])('rejects %s', (_, encoded) => {
    expect(() => decodeBlob(encoded)).toThrow(BlobError)
  })
})

describe('allowlist', () => {
  const patterns = parseAllowedHosts(undefined)

  test.each(['localhost', '127.0.0.1', '[::1]', 'app.test', 'a.b.test', 'app.localhost', 'mac.local', 'APP.TEST'])('allows %s by default', (host) => {
    expect(isAllowedHost(host, patterns)).toBe(true)
  })

  test.each(['test', 'example.com', 'app.test.example.com', 'evil.com', 'localhost.evil.com'])('refuses %s by default', (host) => {
    expect(isAllowedHost(host, patterns)).toBe(false)
  })

  test('never honors a bare wildcard', () => {
    expect(isAllowedHost('evil.com', parseAllowedHosts('*'))).toBe(false)
  })

  test('honors a custom list', () => {
    const custom = parseAllowedHosts(' *.staging.example.com , app.internal ')

    expect(isAllowedHost('site.staging.example.com', custom)).toBe(true)
    expect(isAllowedHost('app.internal', custom)).toBe(true)
    expect(isAllowedHost('app.test', custom)).toBe(false)
  })
})

describe('metadata', () => {
  test('describes a confidential client that Bluesky\'s validators accept', async () => {
    const key = await publicKey()
    const blob = encodeBlob({ callback: 'https://app.test/oauth/callback', scope: 'atproto transition:generic', name: 'Dev app', key })
    const response = await request(`/v1/${blob}`)
    const metadata = await response.json()
    const clientId = `${ORIGIN}/v1/${blob}`

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(isOAuthClientIdDiscoverable(clientId)).toBe(true)
    expect(() => oauthClientMetadataSchema.parse(metadata)).not.toThrow()
    expect(metadata).toMatchObject({
      client_id: clientId,
      client_name: 'Dev app',
      redirect_uris: [`${clientId}/callback`],
      scope: 'atproto transition:generic',
      dpop_bound_access_tokens: true,
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'ES256',
      jwks: { keys: [{ kty: 'EC', crv: 'P-256', x: key.x, y: key.y, alg: 'ES256', use: 'sig', kid: await thumbprint(key) }] },
    })
  })

  test('describes a public client when no key is given', async () => {
    const blob = encodeBlob({ callback: 'http://127.0.0.1/callback', scope: 'atproto' })
    const metadata = await (await request(`/v1/${blob}`)).json()

    expect(() => oauthClientMetadataSchema.parse(metadata)).not.toThrow()
    expect(metadata.token_endpoint_auth_method).toBe('none')
    expect(metadata.jwks).toBeUndefined()
  })

  test('uses an explicit kid when given', async () => {
    const blob = encodeBlob({ callback: 'https://app.test/cb', scope: 'atproto', key: await publicKey(), kid: 'dev-1' })
    const metadata = await (await request(`/v1/${blob}`)).json()

    expect(metadata.jwks.keys[0].kid).toBe('dev-1')
  })

  test('mints client ids under PUBLIC_URL when set', async () => {
    const blob = encodeBlob({ callback: 'https://app.test/cb', scope: 'atproto' })
    const metadata = await (await request(`/v1/${blob}`, { PUBLIC_URL: 'https://broker.example.com/' })).json()

    expect(metadata.client_id).toBe(`https://broker.example.com/v1/${blob}`)
  })

  test('refuses a callback host outside the allowlist', async () => {
    const blob = encodeBlob({ callback: 'https://evil.com/steal', scope: 'atproto' })
    const response = await request(`/v1/${blob}`)

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('InvalidClient')
  })

  test('refuses a query string, which would change the client id', async () => {
    const blob = encodeBlob({ callback: 'https://app.test/cb', scope: 'atproto' })

    expect((await request(`/v1/${blob}?x=1`)).status).toBe(400)
  })

  test('refuses a key that is not on the curve', async () => {
    const blob = encodeBlob({ callback: 'https://app.test/cb', scope: 'atproto', key: { x: 'A'.repeat(43), y: 'A'.repeat(43) } })

    expect((await request(`/v1/${blob}`)).status).toBe(400)
  })

  test('refuses a malformed blob', async () => {
    expect((await request('/v1/not-a-blob')).status).toBe(400)
  })
})

describe('callback', () => {
  test('redirects to the callback with the OAuth parameters', async () => {
    const blob = encodeBlob({ callback: 'https://app.test/oauth/callback?keep=1', scope: 'atproto' })
    const response = await request(`/v1/${blob}/callback?code=abc&state=xyz&iss=https%3A%2F%2Fbsky.social`)
    const location = new URL(response.headers.get('location')!)

    expect(response.status).toBe(302)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(location.origin + location.pathname).toBe('https://app.test/oauth/callback')
    expect(Object.fromEntries(location.searchParams)).toEqual({ keep: '1', code: 'abc', state: 'xyz', iss: 'https://bsky.social' })
  })

  test('refuses to redirect outside the allowlist', async () => {
    const blob = encodeBlob({ callback: 'https://evil.com/steal', scope: 'atproto' })

    expect((await request(`/v1/${blob}/callback?code=abc`)).status).toBe(400)
  })

  test('honors a widened allowlist', async () => {
    const blob = encodeBlob({ callback: 'https://site.staging.example.com/cb', scope: 'atproto' })
    const response = await request(`/v1/${blob}/callback?code=abc`, { ALLOWED_CALLBACK_HOSTS: '*.staging.example.com' })

    expect(response.status).toBe(302)
  })
})

describe('pages', () => {
  test('serves the landing page and health check', async () => {
    expect((await request('/')).status).toBe(200)
    expect(await (await request('/health')).json()).toEqual({ ok: true })
    expect((await request('/nope')).status).toBe(404)
  })
})
