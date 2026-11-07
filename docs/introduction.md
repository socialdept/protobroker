# Introduction

**proto.broker** runs confidential AT Protocol OAuth clients on local domains without a tunnel.

Your app on `https://app.test` gets a real confidential client: `private_key_jwt` client authentication, signed client assertions and confidential-client session lifetimes, exactly as it will run in production. No tunnel, no deploy, no account.

- **Stateless:** everything a client needs is encoded in the client id itself, so the service has no database and holds no secrets.
- **Metadata hosting:** the client id is a URL that serves the client metadata, with your public key inline as `jwks`.
- **Callback relay:** the broker redirects the authorization server's callback to your local app, with `code`, `state` and `iss` intact.
- **Local hosts only:** the public instance only redirects to local development hosts, so a crafted client can only send a code back to the machine of the person who approved it.
- **Self-hosting:** it runs as a Cloudflare Worker or as a Bun server in Docker, with an allowlist you can widen.

## A first look

Create a client for your local app. The script makes a P-256 keypair and encodes the public key, callback and scopes into the client id:

```sh
bun run client --callback https://app.test/oauth/callback --scope "atproto transition:generic" --name "My app"
```

It prints the `client_id`, the `redirect_uri`, the `scope` and the `kid` for your app's config, then the private key as PEM:

```
client_id     https://proto.broker/v1/<blob>
redirect_uri  https://proto.broker/v1/<blob>/callback
scope         atproto transition:generic
kid           <thumbprint>
```

Clients never expire and there is nothing to revoke. To rotate, generate a new key, which gives you a new client id.

## Documentation

Start with [Installation](getting-started/installation.md), then [Creating a client](getting-started/clients.md). The docs are grouped by area, and each group has an index of its own:

- **[Getting started](getting-started/README.md)**: [Installation](getting-started/installation.md), [Creating a client](getting-started/clients.md)
- **[How it works](how-it-works.md)**: Why the broker exists, the OAuth flow through it, and the security model.
- **[Endpoints](endpoints.md)**: The routes the broker serves, what they answer, and its errors.
