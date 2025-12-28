FROM node:20-alpine

RUN apk add --no-cache \
  python3 \
  py3-pip \
  ffmpeg \
  curl

RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
