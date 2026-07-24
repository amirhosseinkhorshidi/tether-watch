**ربات تلگرامی قیمت لحظه‌ای تتر (USDT/IRT) از صرافی Bitpin** به‌روزرسانی خودکار هر ۱۵ دقیقه، پاسخ inline در هر چت، و ارسال به کانال.

### نیازمندی‌ها

- Node.js نسخه ۲۰ یا بالاتر
- pnpm
- Redis در حال اجرا
- Nginx (برای تنظیم Webhook تلگرام)

---

### اجرا

```bash
pnpm install
cp .env.example .env
pnpm dev
```

**برای پروداکشن:**

```bash
pnpm build
pnpm start
```

### استقرار دائمی (PM2)

```bash
sudo npm install -g pm2
pnpm build
pm2 start ecosystem.config.cjs
pm2 startup
pm2 save
pm2 logs tether-watch --lines 30
```

### تنظیم Webhook تلگرام

**حتما** برای تنظیم Webhook باید از Nginx استفاده کنید.  
یعنی پورت اپلیکیشن را با Nginx به صورت Reverse Proxy تنظیم کنید تا تلگرام بتواند درخواست‌ها را به درستی دریافت کند.