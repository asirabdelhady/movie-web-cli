# Dockerfile
FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i @whatwg-node/server
RUN npm install

COPY . .

CMD ["node", "index.mjs"]

EXPOSE 3000