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
COPY tarot-veri.js tarot-api.js tarot.html tarot.css tarot-sayfa.js ./
COPY tarot ./tarot
COPY foto-yuva.js foto-sayfa.js yuz-okuma-veri.js yuz-okuma-api.js fotograf-analiz-veri.js fotograf-analiz-api.js ./
COPY yuz-okuma.html yuz-okuma-sayfa.js yuz-okuma.css yuz-harita.js fotograf-analizi.html fotograf-analizi-sayfa.js ./
COPY ask-uyumu-hesap.js ask-uyumu-api.js ask-uyumu.html ask-uyumu.css ask-uyumu-sayfa.js ./
COPY dogum-haritasi-hesap.js dogum-haritasi-veri.js dogum-haritasi-api.js dogum-haritasi.html dogum-haritasi.css dogum-haritasi-sayfa.js ./
COPY melek-sayilari-veri.js melek-sayilari-api.js melek-sayilari.html melek-sayilari.css melek-sayilari-sayfa.js ./
COPY melek ./melek
COPY iching-veri.js iching-api.js iching.html iching.css iching-sayfa.js ./
COPY iching ./iching
COPY run-veri.js run-api.js run-taslari.html run-taslari.css run-sayfa.js ./
COPY run ./run
COPY ay-takvimi-veri.js ay-takvimi-api.js ay-takvimi.html ay-takvimi.css ay-takvimi-sayfa.js ./
COPY ay ./ay
COPY yuz-okuma ./yuz-okuma
COPY fotograf-analizi ./fotograf-analizi
COPY fal ./fal
COPY uzman ./uzman
COPY astroloji ./astroloji
COPY menu ./menu
COPY audio/anamenu.m4a ./audio/
COPY logo/ezo_D.png logo/ezo_E.png ./logo/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
