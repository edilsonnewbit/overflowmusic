FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
RUN addgroup -S app && adduser -S app -G app \
    && chown -R app:app /app
USER app
CMD ["node", "src/worker.js"]
