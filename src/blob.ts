/**
 * The v1 client blob: everything a client's metadata needs, carried in the
 * client_id URL itself so the broker stores nothing.
 *
 * Wire format is base64url (no padding) of a JSON object with short keys:
 *
 *   c  callback URL the broker redirects to (required)
 *   s  OAuth scope string, must include "atproto" (required)
 *   n  client name shown on the consent screen (optional)
 *   k  public P-256 key as {x, y} (optional, omit for a public client)
 *   i  key id for client assertions (optional, defaults to the RFC 7638 thumbprint)
 *
 * Only public material goes in here. The private key never leaves the developer.
 */

export type PublicKeyCoords = { x: string; y: string }

export type ClientBlob = {
  callback: string
  scope: string
  name?: string
  key?: PublicKeyCoords
  kid?: string
}

export class BlobError extends Error {}

const MAX_BLOB_LENGTH = 2048
const MAX_SCOPE_LENGTH = 1024
const MAX_NAME_LENGTH = 100
const KNOWN_KEYS = new Set(['c', 's', 'n', 'k', 'i'])
const BASE64URL = /^[A-Za-z0-9_-]+$/
const KID = /^[A-Za-z0-9._-]{1,64}$/
const COORD = /^[A-Za-z0-9_-]{43}$/

export function encodeBlob(blob: ClientBlob): string {
  const wire: Record<string, unknown> = { c: blob.callback, s: blob.scope }

  if (blob.name !== undefined) wire.n = blob.name
  if (blob.key !== undefined) wire.k = { x: blob.key.x, y: blob.key.y }
  if (blob.kid !== undefined) wire.i = blob.kid

  return base64urlEncode(new TextEncoder().encode(JSON.stringify(wire)))
}

/**
 * Decode and validate a blob. Checks shape only: the callback allowlist and
 * the key's curve point are checked by the caller, since they need config
 * and async crypto respectively.
 */
export function decodeBlob(encoded: string): ClientBlob {
  if (encoded.length === 0 || encoded.length > MAX_BLOB_LENGTH) {
    throw new BlobError(`Client blob must be 1 to ${MAX_BLOB_LENGTH} characters`)
  }

  if (!BASE64URL.test(encoded)) {
    throw new BlobError('Client blob must be unpadded base64url')
  }

  let wire: unknown

  try {
    wire = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(base64urlDecode(encoded)))
  } catch {
    throw new BlobError('Client blob is not valid base64url JSON')
  }

  if (typeof wire !== 'object' || wire === null || Array.isArray(wire)) {
    throw new BlobError('Client blob must be a JSON object')
  }

  const fields = wire as Record<string, unknown>

  for (const key of Object.keys(fields)) {
    if (!KNOWN_KEYS.has(key)) throw new BlobError(`Unknown client blob field: ${key}`)
  }

  return {
    callback: parseCallback(fields.c),
    scope: parseScope(fields.s),
    ...(fields.n !== undefined && { name: parseName(fields.n) }),
    ...(fields.k !== undefined && { key: parseKey(fields.k) }),
    ...(fields.i !== undefined && { kid: parseKid(fields.i) }),
  }
}

function parseCallback(value: unknown): string {
  if (typeof value !== 'string') throw new BlobError('Callback (c) is required')

  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new BlobError('Callback (c) must be an absolute URL')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BlobError('Callback (c) must use http or https')
  }

  if (url.username || url.password) {
    throw new BlobError('Callback (c) must not contain credentials')
  }

  if (url.hash) {
    throw new BlobError('Callback (c) must not contain a fragment')
  }

  return value
}

function parseScope(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_SCOPE_LENGTH) {
    throw new BlobError(`Scope (s) must be 1 to ${MAX_SCOPE_LENGTH} characters`)
  }

  if (!value.split(' ').includes('atproto')) {
    throw new BlobError('Scope (s) must include "atproto"')
  }

  return value
}

function parseName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_NAME_LENGTH) {
    throw new BlobError(`Name (n) must be 1 to ${MAX_NAME_LENGTH} characters`)
  }

  return value
}

function parseKey(value: unknown): PublicKeyCoords {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BlobError('Key (k) must be an object with x and y')
  }

  const { x, y, ...rest } = value as Record<string, unknown>

  if (Object.keys(rest).length > 0) {
    throw new BlobError('Key (k) must only contain x and y')
  }

  if (typeof x !== 'string' || typeof y !== 'string' || !COORD.test(x) || !COORD.test(y)) {
    throw new BlobError('Key (k) coordinates must be 43-character base64url P-256 values')
  }

  return { x, y }
}

function parseKid(value: unknown): string {
  if (typeof value !== 'string' || !KID.test(value)) {
    throw new BlobError('Key id (i) must be 1 to 64 characters of A-Z, a-z, 0-9, ".", "_" or "-"')
  }

  return value
}

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlDecode(encoded: string): Uint8Array {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))

  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
