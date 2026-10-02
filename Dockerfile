FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY server.js auth.js eposta.js ./
COPY index.html styles.css app.js login.html login.css login.js favicon.svg ezoterist-bg.png ezoterist-bg-landscape.png ezoterist-bg-portrait.mp4 ezoterist-bg-landscape.mp4 README.md ./

COPY menu ./menu
COPY logo/ezo_E.png ./logo/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
