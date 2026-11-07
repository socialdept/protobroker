# How it works

Part of the [protobroker docs](introduction.md#documentation). Why the broker exists, the OAuth flow through it, and the security model.

## Why it exists

A confidential client needs its metadata on a public HTTPS URL, because the authorization server fetches it from there. Authorization servers also refuse redirects to local domains such as `.test`, `.local` and `.localhost`. An app running on your machine can do neither.

Until now that left two options. Expose your machine through a tunnel, or develop as a loopback public client, with no client authentication and sessions capped at two weeks, and only find out how the confidential flow behaves after you deploy.

proto.broker hosts the metadata and relays the callback, so the confidential flow you test locally is the one you ship.

## The flow

1. You generate a P-256 keypair locally. The private key never leaves your machine.
2. Your public key, callback URL and scopes are encoded into the client id:
   `https://proto.broker/v1/<blob>`
3. The authorization server fetches that URL and gets your client metadata, with the public key inline as `jwks`.
4. After the user consents, the authorization server redirects to `https://proto.broker/v1/<blob>/callback`, which sends the browser on to your local callback with `code`, `state` and `iss` intact.

With a key, the metadata describes a confidential client using `private_key_jwt` and `ES256`. Without one, it describes a public client with `token_endpoint_auth_method` set to `none`. Either way it asks for DPoP-bound access tokens.

## Security model

- The broker only redirects to allowed hosts. The public instance allows local development hosts only: `localhost`, `127.0.0.1`, `[::1]`, `*.test`, `*.localhost` and `*.local`. A crafted client can therefore only send an authorization code back to the machine of the person who approved it.
- No private keys, tokens or codes are stored. Codes pass through a redirect with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- The public key is checked to be a valid P-256 point before it is published.
