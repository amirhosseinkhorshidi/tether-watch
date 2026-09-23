# TetherWatch

Telegram bot that reports the **live USDT/IRT price** from the **Bitpin** exchange. The price is refreshed automatically in the background, available instantly via inline queries in any chat, and posted on a schedule to a Telegram channel.

## Features

- Live USDT/IRT price sourced from the Bitpin API
- Automatic background price refresh (default: every ~15 minutes, configurable)
- Inline query support — get the price in any chat by typing `@YourBotUsername`
- Scheduled price broadcast to a Telegram channel
- Redis-backed caching with configurable TTL
- Runs as a webhook-based Fastify server (no long polling)

## Tech Stack

- **Runtime:** Node.js (TypeScript), [grammY](https://grammy.dev/) for the Telegram Bot API
- **Web server:** [Fastify](https://fastify.dev/) (webhook receiver)
- **Cache:** Redis (via `ioredis`)
- **Scheduling:** `croner`
- **Validation:** `zod`
- **Logging:** `pino`

## Requirements

- Node.js 20+ (project targets `>=24`, see `engines` in `package.json`)
- [pnpm](https://pnpm.io/)
- A running Redis instance
- Nginx (required to expose the webhook endpoint over HTTPS to Telegram)
- A domain name with a valid TLS certificate (e.g. via Let's Encrypt / Certbot)

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values — see [Environment Variables](#environment-variables) below.

### 3. Run in development

```bash
pnpm dev
```

### 4. Build & run in production

```bash
pnpm build
pnpm start
```

---

## Environment Variables

| Variable                        | Description                                                              | Default                                          |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| `BOT_TOKEN`                      | Telegram bot token issued by [@BotFather](https://t.me/BotFather)         | **required**                                       |
| `CHANNEL_ID`                     | Telegram channel ID/username the bot posts price updates to               | **required**                                       |
| `ADMIN_ID`                       | Telegram numeric user ID of the bot admin                                 | **required**                                       |
| `REDIS_HOST`                     | Redis server host                                                          | `localhost`                                       |
| `REDIS_PORT`                     | Redis server port                                                          | `6379`                                            |
| `REDIS_DB`                       | Redis database index                                                       | `0`                                                |
| `REDIS_PASSWORD`                 | Redis password (leave empty if none)                                       | *(empty)*                                          |
| `REDIS_PREFIX`                   | Key prefix used for all keys the app writes to Redis                      | `twatch`                                          |
| `REDIS_DEFAULT_TIMEOUT`          | Default TTL, in seconds, for cached keys                                  | `300`                                             |
| `WEBHOOK_URL`                    | Public base URL Telegram sends updates to, e.g. `https://example.com`     | **required**                                       |
| `WEBHOOK_PATH`                   | Path appended to `WEBHOOK_URL`; also the local Fastify route              | `/`                                                |
| `WEBAPP_HOST`                    | Host/IP the internal Fastify server binds to                              | `127.0.0.1`                                       |
| `WEBAPP_PORT`                    | Port the internal Fastify server listens on                               | `8443`                                            |
| `API_BASE_URL`                   | Bitpin ticker API endpoint                                                 | `https://api.bitpin.org/api/v1/mkt/tickers/`      |
| `REDIS_UPDATE_INTERVAL_MINUTES`  | How often the price cache is refreshed from Bitpin                        | `14`                                               |
| `CHANNEL_SEND_INTERVAL_MINUTES`  | How often the price is posted to the Telegram channel                     | `15`                                               |
| `REDIS_EXPIRY_MINUTES`           | TTL, in minutes, applied to the cached price                              | `30`                                               |
| `TIMEZONE`                       | Timezone used for scheduling                                              | `Asia/Tehran`                                     |
| `ENABLE_LOGGING`                 | Enable verbose logging                                                    | `false`                                           |

---

## Permanent Deployment (PM2)

```bash
sudo npm install -g pm2
pnpm build
pm2 start ecosystem.config.cjs
pm2 startup
pm2 save
pm2 logs tether-watch --lines 30
```

> **Note:** `ecosystem.config.cjs` runs the app as a **single fork instance** — never in cluster mode. The scheduler (`croner`) must run exactly once per process; running multiple instances would fire the cron jobs N times and post duplicate messages to the channel.

---

## Telegram Webhook & Nginx Setup

TetherWatch does **not** use long polling. It runs an internal Fastify server (bound to `WEBAPP_HOST:WEBAPP_PORT`) that receives updates via **webhook**. Telegram only delivers updates over HTTPS, so Nginx must sit in front of the app as a reverse proxy, terminate TLS, and forward requests to the internal port.

Setup steps:

1. Point your domain's DNS `A` record to your server.
2. Obtain a TLS certificate for the domain (e.g. with `certbot`).
3. In `.env`, set `WEBHOOK_URL=https://your-domain.com` and `WEBHOOK_PATH=/twatch` — the path must match the `location` block in the Nginx config below.
4. Set `WEBAPP_HOST` / `WEBAPP_PORT` to match the `proxy_pass` target in the Nginx config (e.g. `127.0.0.3:8443`).
5. Apply the Nginx config, reload Nginx, then start/restart the bot. On boot, it automatically calls `setWebhook()` with the full URL.

### Example Nginx configuration

> Replace `example.com` with your actual domain, and adjust the `proxy_pass` target if you changed `WEBAPP_HOST` / `WEBAPP_PORT`.

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;

    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location /twatch {
        proxy_pass http://127.0.0.3:8443;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

With this setup, Telegram sends updates to `https://example.com/twatch`; Nginx terminates TLS and forwards the request to the internal Fastify server listening on `127.0.0.3:8443`, which is where the bot actually processes it.

---

## Project Structure

```
src/
├── api/
│   └── bitpin.ts        # Bitpin API client
├── bot/
│   ├── bot.ts            # grammY bot instance & setup
│   └── handlers.ts       # Command / inline query handlers
├── scheduler/
│   └── jobs.ts           # Cron jobs: price refresh + channel broadcast
├── utils/
│   ├── format.ts         # Price/number formatting helpers
│   └── redis.ts          # Redis client
├── config.ts              # Typed, validated environment configuration
├── logger.ts               # Pino logger instance
└── main.ts                  # Entry point (Fastify + webhook + scheduler)
```

## Available Scripts

| Command          | Description                             |
| ----------------- | ----------------------------------------- |
| `pnpm dev`        | Run in watch mode with `tsx`              |
| `pnpm build`      | Compile TypeScript to `dist/`             |
| `pnpm start`      | Run the compiled build                    |
| `pnpm typecheck`  | Type-check without emitting output        |
| `pnpm lint`       | Run ESLint                                |
| `pnpm format`     | Format code with Biome                    |
| `pnpm check`      | Type-check + lint                         |
