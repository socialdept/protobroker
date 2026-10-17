import { html } from 'hono/html'

export function landingPage(origin: string) {
  return html`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>proto.broker</title>
    <meta name="description" content="Stateless client metadata for atproto OAuth local development." />
    <style>
      :root {
        --bg: #fafaf9;
        --fg: #1c1917;
        --muted: #57534e;
        --line: #e7e5e4;
        --code: #f5f5f4;
        color-scheme: light dark;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0c0a09;
          --fg: #f5f5f4;
          --muted: #a8a29e;
          --line: #292524;
          --code: #1c1917;
        }
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--fg);
        font: 16px/1.6 ui-sans-serif, system-ui, sans-serif;
      }
      main { max-width: 680px; margin: 0 auto; padding: 64px 16px; }
      h1 { font-size: 28px; margin: 0 0 8px; }
      h2 { font-size: 18px; margin: 40px 0 8px; }
      p, li { color: var(--muted); }
      code, pre { font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--code); }
      code { padding: 2px 6px; border-radius: 4px; }
      pre { padding: 16px; border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; }
      a { color: inherit; }
    </style>
  </head>
  <body>
    <main>
      <h1>proto.broker</h1>
      <p>Client metadata for atproto OAuth local development. Point your app at a <code>.test</code> or <code>localhost</code> callback and test the real OAuth flow, confidential clients included.</p>

      <h2>Why it exists</h2>
      <p>An authorization server fetches your client metadata from a public HTTPS URL, and it refuses redirects to local domains like <code>.test</code>. A local app can do neither, so this service does both for it.</p>

      <h2>How it works</h2>
      <ol>
        <li>You generate a P-256 keypair locally. The private key never leaves your machine.</li>
        <li>Your public key, callback and scopes are encoded into the client id itself, so this service stores nothing.</li>
        <li>The authorization server fetches <code>${origin}/v1/&lt;blob&gt;</code> and gets your metadata.</li>
        <li>After consent it redirects to <code>${origin}/v1/&lt;blob&gt;/callback</code>, which sends you on to your local app.</li>
      </ol>

      <h2>Create a client</h2>
      <pre>bun run client --callback https://app.test/oauth/callback --scope "atproto transition:generic"</pre>
      <p>Callbacks are limited to local development hosts on this instance, so a client can only ever send a code back to the machine that approved it.</p>

      <h2>Self-hosting</h2>
      <p>It runs as a Cloudflare Worker or as a Bun server in Docker, with no database. See the README for setup and for widening the allowed callback hosts.</p>
    </main>
  </body>
</html>`
}
