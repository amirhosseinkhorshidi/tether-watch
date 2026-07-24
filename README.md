ربات تلگرامی قیمت لحظه‌ای تتر (USDT/IRT) از صرافی Bitpin — به‌روزرسانی خودکار هر ۱۵ دقیقه، پاسخ inline در هر چت، و ارسال به کانال.

## اجرا

نیازمند Node.js ≥ 20، pnpm، و یک Redis در حال اجرا.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

برای پروداکشن:

```bash
pnpm build
pnpm start
```

مقادیر لازم در `.env`: `BOT_TOKEN`, `CHANNEL_ID`, `ADMIN_ID`, `WEBHOOK_URL`.

## استقرار دائمی (PM2)

بلوک `deploy/nginx-tether-watch.conf` را داخل `server{}` دامنه‌ات بگذار، سپس:

```bash
sudo systemctl enable --now redis-server
sudo nginx -t && sudo systemctl reload nginx
sudo npm install -g pm2
pnpm build
pm2 start ecosystem.config.cjs
pm2 startup
pm2 save
pm2 logs tether-watch --lines 30
```
