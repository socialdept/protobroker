import app from './app'

const port = Number(process.env.PORT ?? 8787)

Bun.serve({
  port,
  fetch: (request) =>
    app.fetch(request, {
      ALLOWED_CALLBACK_HOSTS: process.env.ALLOWED_CALLBACK_HOSTS,
      PUBLIC_URL: process.env.PUBLIC_URL,
    }),
})

console.log(JSON.stringify({ message: 'proto.broker listening', port }))
