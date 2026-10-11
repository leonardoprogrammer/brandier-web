FROM node:22-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
RUN groupadd -r brandier && useradd -r -g brandier brandier
WORKDIR /app
COPY --from=build /build/dist/brandier-web ./dist/brandier-web
USER brandier
ENV PORT=4000
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||4000)+'/entrar',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/brandier-web/server/server.mjs"]
