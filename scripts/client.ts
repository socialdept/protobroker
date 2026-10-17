import { parseArgs } from 'node:util'
import { type ClientBlob, encodeBlob } from '../src/blob'
import { thumbprint } from '../src/metadata'

const { values } = parseArgs({
  options: {
    broker: { type: 'string', default: 'https://proto.broker' },
    callback: { type: 'string' },
    scope: { type: 'string', default: 'atproto transition:generic' },
    name: { type: 'string' },
    public: { type: 'boolean', default: false },
  },
})

if (!values.callback) {
  console.error('Usage: bun run client --callback <url> [--scope "atproto ..."] [--name <name>] [--public] [--broker <url>]')
  process.exit(1)
}

const blob: ClientBlob = {
  callback: values.callback,
  scope: values.scope,
  ...(values.name !== undefined && { name: values.name }),
}

let privateKeyPem: string | undefined

if (!values.public) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))

  blob.key = { x: jwk.x!, y: jwk.y! }
  privateKeyPem = toPem(pkcs8)
}

const clientId = `${values.broker.replace(/\/+$/, '')}/v1/${encodeBlob(blob)}`

console.log(`client_id     ${clientId}`)
console.log(`redirect_uri  ${clientId}/callback`)
console.log(`scope         ${blob.scope}`)

if (blob.key && privateKeyPem) {
  console.log(`kid           ${await thumbprint(blob.key)}`)
  console.log(`\n${privateKeyPem}`)
} else {
  console.log('auth          public client (token_endpoint_auth_method: none)')
}

function toPem(der: Uint8Array): string {
  const base64 = Buffer.from(der).toString('base64')

  return `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`
}
