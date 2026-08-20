FROM node:18-alpine

# tzdata lets the TZ env var actually shift cron's wall-clock schedule.
RUN apk add --no-cache tzdata

WORKDIR /app
ENV NODE_ENV=production

# Install production deps against the lockfile first (better layer caching).
COPY package*.json ./
RUN npm ci --omit=dev

# App code and runtime config.
COPY src ./src
COPY config ./config
COPY docker/crontab /etc/crontabs/root
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && mkdir -p /app/state

CMD ["/usr/local/bin/entrypoint.sh"]
