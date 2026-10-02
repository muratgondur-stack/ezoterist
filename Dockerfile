FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY server.js auth.js eposta.js ./
COPY index.html styles.css app.js login.html login.css login.js favicon.svg favicon.png apple-touch-icon.png ezoterist-bg.png ezoterist-bg-landscape.png ezoterist-bg-portrait.mp4 ezoterist-bg-landscape.mp4 README.md ./

COPY astro.js astroloji-veri.js astroloji-api.js astroloji.html astroloji.css astroloji-sayfa.js ./
COPY uzman-api.js uzmanlar.js uzman-kart.js uzman.html uzman.css uzman.js ./
COPY numeroloji-hesap.js numeroloji-veri.js numeroloji-api.js numeroloji.html numeroloji.css numeroloji-sayfa.js ./
COPY numeroloji ./numeroloji
COPY ruya-veri.js ruya-api.js ruya.html ruya.css ruya-sayfa.js ./
COPY ruya ./ruya
COPY foto-fal.js fal-veri.js fal-api.js fal.html fal.css fal-sayfa.js ./
COPY el-fali-veri.js el-fali-api.js el-fali.html el-fali-sayfa.js ./
COPY el-fali ./el-fali
COPY fal ./fal
COPY uzman ./uzman
COPY astroloji ./astroloji
COPY menu ./menu
COPY audio/anamenu.m4a ./audio/
COPY logo/ezo_D.png logo/ezo_E.png ./logo/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
