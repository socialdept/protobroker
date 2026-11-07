# Installation

Part of the [protobroker docs](../introduction.md#documentation). Installing, configuring and running a broker on Cloudflare Workers, in Docker or on Bun.

To use the public instance at proto.broker you only need a checkout to run the [client script](clients.md). The rest of this page is for running a broker of your own.

## Installing

```sh
git clone https://github.com/socialdept/protobroker.git
cd protobroker
bun install
```

## Configuration

There are two settings, both optional:

| Variable | Default | Meaning |
| --- | --- | --- |
| `ALLOWED_CALLBACK_HOSTS` | `localhost,127.0.0.1,[::1],*.test,*.localhost,*.local` | Comma-separated hosts the broker redirects to. Exact hosts or `*.suffix`. A bare `*` is ignored |
| `PUBLIC_URL` | the request origin | Origin client ids are minted under. Set it when running behind a proxy |

Hosts match without regard to case. A `*.suffix` pattern matches subdomains at any depth but not the suffix itself, so `*.test` matches `app.test` and `a.b.test` but not `test`.

Widening the allowlist, for example to `*.staging.example.com`, lets a staging site behind basic auth use the broker too.

The Bun server also reads `PORT`, which defaults to `8787`.

## Running

### Cloudflare Workers

```sh
bun install
bunx wrangler deploy
```

Settings live in `wrangler.jsonc` under `vars`. The default config deploys to your `workers.dev` subdomain.

The `production` environment in `wrangler.jsonc` is the public instance at proto.broker, deployed with `wrangler deploy --env production`. To run your own on a custom domain, copy that block and change the `routes` pattern and `PUBLIC_URL` to your hostname.

### Docker

```sh
docker build -t protobroker .
docker run -p 8787:8787 -e PUBLIC_URL=https://broker.example.com protobroker
```

The image runs the same app on Bun, listening on port 8787. Put it behind any HTTPS reverse proxy.

### Bun

```sh
bun run start      # Bun server on :8787
bun run dev        # wrangler dev
```
