FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY src ./src
ENV PORT=8787
EXPOSE 8787
USER bun
CMD ["bun", "run", "src/server.ts"]
