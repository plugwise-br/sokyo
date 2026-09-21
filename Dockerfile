FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY src ./src
COPY public ./public
ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
