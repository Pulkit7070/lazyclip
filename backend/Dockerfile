# reely agent — container for Google Cloud Run.
FROM node:22-slim

# ffmpeg (all media ops) + yt-dlp (Mode 3). No GPU needed.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
  && pip3 install --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# The Telegram gateway (long-polling). See docs/DEPLOY-GCP.md for the Cloud Run HTTP note.
CMD ["node", "--import", "tsx", "src/gateway/run.ts"]
