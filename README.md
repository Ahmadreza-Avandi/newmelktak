# ملک تک
 
سامانه مدیریت املاک، مشتریان و قراردادها با React، Express و PostgreSQL. اجرای محلی نیز به PostgreSQL متصل می‌شود؛ PGlite فقط برای تست‌های موجود استفاده می‌شود.
 
## اجرا
 
Node.js 24 لازم است.
 
```bash
npm ci --include=dev
cp .env.example .env
```
 
پیش از اجرا، `DATABASE_URL` را به PostgreSQL محلی تنظیم کنید و مقدار نمونه `PLATFORM_ADMIN_PASSWORD` را با یک گذرواژه تصادفی ۱۶ تا ۷۲ بایتی جایگزین کنید. فایل نمونه را با `.env` واقعی اشتباه نگیرید. برای توسعه `NODE_ENV=development` و برای تولید `NODE_ENV=production` انتخاب کنید. برنامه داده نمونه نمی‌سازد.
 
```bash
npm run db:start
pg_isready -h 127.0.0.1 -p 55432
```

پس از دیدن `accepting connections`، برنامه را در همین یا ترمینال دیگری اجرا کنید:

```bash
npm run dev
```

برای خاموش‌کردن دیتابیس پس از توقف برنامه با `Ctrl+C`، اجرا کنید: `npm run db:stop`. دستورهای وضعیت و جزئیات راه‌اندازی در [راهنمای PostgreSQL و استقرار](DEPLOYMENT.fa.md) آمده است.
 
برای تولید:
 
```bash
npm run build
npm start
```
 
[راهنمای PostgreSQL و استقرار](DEPLOYMENT.fa.md) شامل تنظیم دیتابیس، VPS، دامنه و بکاپ است. هیچ رمز یا `.env` واقعی را وارد Git نکنید. حساب‌های نمونه شناخته‌شده نصب قدیمی بدون حذف سوابق مرتبط، غیرفعال و بی‌نام می‌شوند.
 
## بررسی‌ها
 
```bash
npm run lint
node --import tsx --test scripts/production-security.test.ts scripts/production-startup.test.ts scripts/crm-regression.test.ts
```
 
تست‌های موجود از دیتابیس موقت PGlite استفاده می‌کنند؛ اجرای اصلی با PostgreSQL و `DATABASE_URL` است. پرداخت واقعی هنوز پیاده‌سازی نشده است.
 
