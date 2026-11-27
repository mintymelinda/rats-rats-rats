FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src
COPY public ./public

RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]

ENV PORT=3000
EXPOSE 3000

USER node
CMD ["node", "src/server.js"]
