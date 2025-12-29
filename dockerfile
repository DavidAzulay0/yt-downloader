FROM node:20-alpine

# dependências do sistema
RUN apk add --no-cache \
  ffmpeg \
  curl \
  python3

# instalar yt-dlp como BINÁRIO GLOBAL
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp && \
  chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["npm", "start"]

