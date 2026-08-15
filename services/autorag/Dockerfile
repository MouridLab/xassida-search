FROM node:26-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM oven/bun:1.3.14-alpine AS bun-runtime

FROM node:26-alpine
WORKDIR /app
COPY --from=bun-runtime /usr/local/bin/bun /usr/local/bin/bun
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY autorag.config.json server.ts rag-response.ts sync-corpus.ts entrypoint.sh ./
RUN chmod 0755 /app/entrypoint.sh
ENV AUTORAG_CONFIG=/app/autorag.config.json
EXPOSE 8080
ENTRYPOINT ["/app/entrypoint.sh"]
