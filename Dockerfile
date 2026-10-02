FROM node:20-bookworm-slim

# Alev'in sesi için Piper (seslendirme) ve mp3 dönüştürücü. Ses modeli imaja girmez:
# kalıcı klasörde ${DATA_DIR}/piper/tr_TR-alev-medium.onnx (+ .onnx.json) durur.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl lame \
  && curl -fsSL https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz | tar -xz -C /opt \
  && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY server.js auth.js eposta.js ./
COPY index.html styles.css app.js login.html login.css login.js favicon.svg favicon.png apple-touch-icon.png ezoterist-bg.png ezoterist-bg-landscape.png ezoterist-bg-portrait.mp4 ezoterist-bg-landscape.mp4 README.md ./

COPY astro.js astroloji-veri.js astroloji-api.js astroloji.html astroloji.css astroloji-sayfa.js ./
COPY astroloji ./astroloji
COPY menu ./menu
COPY audio/anamenu.m4a ./audio/
COPY logo/ezo_D.png logo/ezo_E.png ./logo/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
