# Creating a client

Part of the [protobroker docs](../introduction.md#documentation). Minting a client id with the client script, and the blob format it encodes.

## The client script

```sh
bun run client --callback https://app.test/oauth/callback --scope "atproto transition:generic" --name "My app"
```

This prints the `client_id`, the `redirect_uri`, the `scope`, the `kid` and a PEM private key for your app's config. The private key is generated locally and never leaves your machine.

| Flag | Default | Meaning |
| --- | --- | --- |
| `--callback` | | Your app's local callback URL. Required |
| `--scope` | `atproto transition:generic` | OAuth scope string |
| `--name` | | Client name shown on the consent screen |
| `--public` | off | Make a public client with no key |
| `--broker` | `https://proto.broker` | Origin of the broker the client id points at, for a self-hosted broker |

A public client with no key is also possible with `--public`, but a loopback client already covers that case without a broker.

Client assertions must carry the printed `kid`, which is the RFC 7638 thumbprint of the public key unless you set one in the blob.

Clients never expire and there is nothing to revoke. To rotate, generate a new key, which gives you a new client id.

## Blob format (v1)

The client id is `https://proto.broker/v1/<blob>`. The blob is unpadded base64url of a JSON object with short keys:

| Key | Required | Meaning |
| --- | --- | --- |
| `c` | yes | Callback URL the broker redirects to. An absolute `http` or `https` URL with no credentials and no fragment |
| `s` | yes | OAuth scope string, 1 to 1024 characters. Must include `atproto` |
| `n` | no | Client name shown on the consent screen, 1 to 100 characters |
| `k` | no | Public P-256 key as `{ "x": "...", "y": "..." }`, each a 43-character base64url coordinate. Omit for a public client |
| `i` | no | Key id, 1 to 64 characters of letters, digits, `.`, `_` or `-`. Defaults to the RFC 7638 thumbprint of `k` |

The blob is at most 2048 characters. Unknown keys are rejected, and the callback's host must be on the broker's [allowlist](installation.md#configuration). Any language can build a client id with a JSON encoder and base64url.
