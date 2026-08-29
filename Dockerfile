FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY index.html styles.css app.js favicon.svg README.md ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
