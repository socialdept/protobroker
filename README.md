# proto.broker

Run confidential AT Protocol OAuth clients on local domains without a tunnel.

Your app on `https://app.test` gets a real confidential client: `private_key_jwt` client authentication, signed client assertions and confidential-client session lifetimes, exactly as it will run in production. No tunnel, no deploy, no account.

It is stateless. Everything a client needs is encoded in the client id itself, so the service has no database and holds no secrets.

## Why it exists

A confidential client needs its metadata on a public HTTPS URL, because the authorization server fetches it from there. Authorization servers also refuse redirects to local domains such as `.test`, `.local` and `.localhost`. An app running on your machine can do neither.

Until now that left two options. Expose your machine through a tunnel, or develop as a loopback public client, with no client authentication and sessions capped at two weeks, and only find out how the confidential flow behaves after you deploy.

proto.broker hosts the metadata and relays the callback, so the confidential flow you test locally is the one you ship.

## How it works

1. You generate a P-256 keypair locally. The private key never leaves your machine.
2. Your public key, callback URL and scopes are encoded into the client id:
   `https://proto.broker/v1/<blob>`
3. The authorization server fetches that URL and gets your client metadata, with the public key inline as `jwks`.
4. After the user consents, the authorization server redirects to `https://proto.broker/v1/<blob>/callback`, which sends the browser on to your local callback with `code`, `state` and `iss` intact.

Clients never expire and there is nothing to revoke. To rotate, generate a new key, which gives you a new client id.

## Create a client

```sh
bun run client --callback https://app.test/oauth/callback --scope "atproto transition:generic" --name "My app"
```

This prints the `client_id`, the `redirect_uri`, the `kid` and a PEM private key for your app's config.

A public client with no key is also possible with `--public`, but a loopback client already covers that case without a broker.

Client assertions must carry the printed `kid`, which is the RFC 7638 thumbprint of the public key unless you set one in the blob.

## Blob format (v1)

The blob is unpadded base64url of a JSON object with short keys:

| Key | Required | Meaning |
| --- | --- | --- |
| `c` | yes | Callback URL the broker redirects to |
| `s` | yes | OAuth scope string. Must include `atproto` |
| `n` | no | Client name shown on the consent screen |
| `k` | no | Public P-256 key as `{ "x": "...", "y": "..." }`. Omit for a public client |
| `i` | no | Key id. Defaults to the RFC 7638 thumbprint of `k` |

Unknown keys are rejected. Any language can build a client id with a JSON encoder and base64url.

## Endpoints

| Route | Response |
| --- | --- |
| `GET /v1/:blob` | Client metadata JSON |
| `GET /v1/:blob/callback` | 302 to the encoded callback, query string forwarded |
| `GET /health` | `{ "ok": true }` |
| `GET /` | Landing page |

Invalid clients get a 400 with `{ "error": "InvalidClient", "message": "..." }`.

## Security model

- The broker only redirects to allowed hosts. The public instance allows local development hosts only: `localhost`, `127.0.0.1`, `[::1]`, `*.test`, `*.localhost` and `*.local`. A crafted client can therefore only send an authorization code back to the machine of the person who approved it.
- No private keys, tokens or codes are stored. Codes pass through a redirect with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- The public key is checked to be a valid P-256 point before it is published.

## Self-hosting

There are two settings, both optional:

| Variable | Default | Meaning |
| --- | --- | --- |
| `ALLOWED_CALLBACK_HOSTS` | `localhost,127.0.0.1,[::1],*.test,*.localhost,*.local` | Comma-separated hosts the broker redirects to. Exact hosts or `*.suffix`. A bare `*` is ignored |
| `PUBLIC_URL` | the request origin | Origin client ids are minted under. Set it when running behind a proxy |

Widening the allowlist, for example to `*.staging.example.com`, lets a staging site behind basic auth use the broker too.

### Cloudflare Workers

```sh
bun install
bunx wrangler deploy
```

Settings live in `wrangler.jsonc` under `vars`. The default config deploys to your `workers.dev` subdomain.

The `production` environment in `wrangler.jsonc` is the public instance at proto.broker, deployed with `wrangler deploy --env production`. To run your own on a custom domain, copy that block and change the `routes` pattern and `PUBLIC_URL` to your hostname.

### Docker

```sh
docker build -t proto-broker .
docker run -p 8787:8787 -e PUBLIC_URL=https://broker.example.com proto-broker
```

The image runs the same app on Bun. Put it behind any HTTPS reverse proxy.

## Development

```sh
bun install
bun test           # unit and route tests, including Bluesky's own metadata validators
bun run typecheck  # Worker and Bun builds
bun run dev        # wrangler dev
bun run start      # Bun server on :8787
```

## License

MIT
