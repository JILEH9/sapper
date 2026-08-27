FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p /app/logs
CMD ["sh", "-c", "node src/index.js >> /app/logs/bot.log 2>&1"]
