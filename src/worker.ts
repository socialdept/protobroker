import app from './app'

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx)
  },
} satisfies ExportedHandler<Env>
