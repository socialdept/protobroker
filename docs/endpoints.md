# Endpoints

Part of the [protobroker docs](introduction.md#documentation). The routes the broker serves, what they answer, and its errors.

| Route | Response |
| --- | --- |
| `GET /v1/:blob` | Client metadata JSON |
| `GET /v1/:blob/callback` | 302 to the encoded callback, query string forwarded |
| `GET /health` | `{ "ok": true }` |
| `GET /` | Landing page |

## Client metadata

`GET /v1/:blob` answers with the client metadata document, whose `client_id` is that URL and whose only redirect URI is the same URL with `/callback` added. It is served with `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=3600`.

The client id is the exact URL, so a request with a query string is refused.

## Callback

`GET /v1/:blob/callback` redirects to the callback encoded in the blob. Every query parameter of the request is copied onto it, replacing one of the same name, so `code`, `state` and `iss` arrive intact. The redirect carries `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.

## Errors

Invalid clients get a 400 with `{ "error": "InvalidClient", "message": "..." }`. That covers a malformed blob, a callback host outside the [allowlist](getting-started/installation.md#configuration), a key that is not a valid P-256 point, and a metadata request with a query string.

Unknown routes get a 404 with `{ "error": "NotFound", "message": "Not found" }`.
