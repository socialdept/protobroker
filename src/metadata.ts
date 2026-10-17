import { BlobError, base64urlEncode, type ClientBlob, type PublicKeyCoords } from './blob'

export type ClientMetadata = {
  client_id: string
  client_name?: string
  application_type: 'web'
  grant_types: ['authorization_code', 'refresh_token']
  response_types: ['code']
  redirect_uris: [string]
  scope: string
  dpop_bound_access_tokens: true
  token_endpoint_auth_method: 'private_key_jwt' | 'none'
  token_endpoint_auth_signing_alg?: 'ES256'
  jwks?: { keys: [PublicJwk] }
}

type PublicJwk = {
  kty: 'EC'
  crv: 'P-256'
  x: string
  y: string
  alg: 'ES256'
  use: 'sig'
  kid: string
}

/**
 * Build the client metadata document for a decoded blob. With a key it
 * describes a confidential client using private_key_jwt, without one a
 * public client.
 */
export async function buildMetadata(clientId: string, blob: ClientBlob): Promise<ClientMetadata> {
  const base = {
    client_id: clientId,
    ...(blob.name !== undefined && { client_name: blob.name }),
    application_type: 'web' as const,
    grant_types: ['authorization_code', 'refresh_token'] as ['authorization_code', 'refresh_token'],
    response_types: ['code'] as ['code'],
    redirect_uris: [`${clientId}/callback`] as [string],
    scope: blob.scope,
    dpop_bound_access_tokens: true as const,
  }

  if (blob.key === undefined) {
    return { ...base, token_endpoint_auth_method: 'none' }
  }

  await assertOnCurve(blob.key)

  return {
    ...base,
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_signing_alg: 'ES256',
    jwks: {
      keys: [
        {
          kty: 'EC',
          crv: 'P-256',
          x: blob.key.x,
          y: blob.key.y,
          alg: 'ES256',
          use: 'sig',
          kid: blob.kid ?? (await thumbprint(blob.key)),
        },
      ],
    },
  }
}

/**
 * RFC 7638 JWK thumbprint: SHA-256 over the required members in lexical order.
 */
export async function thumbprint(key: PublicKeyCoords): Promise<string> {
  const canonical = `{"crv":"P-256","kty":"EC","x":"${key.x}","y":"${key.y}"}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))

  return base64urlEncode(new Uint8Array(digest))
}

async function assertOnCurve(key: PublicKeyCoords): Promise<void> {
  try {
    await crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x: key.x, y: key.y },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
  } catch {
    throw new BlobError('Key (k) is not a valid P-256 public key')
  }
}
