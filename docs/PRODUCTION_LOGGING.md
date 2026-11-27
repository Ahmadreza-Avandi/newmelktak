# مستندات سیستم Logging و خطاها در محیط تولید (Melktak)

این سند معماری ثبت رویدادها (Logging)، مدیریت خطاها، پوشاندن اطلاعات حساس (Redaction)، چرخش و نگهداری لاگ‌ها و نحوه مشاهده آن‌ها در پنل Platform Admin را در پروژه ملک‌تک شرح می‌دهد.

---

## ۱. ساختار کلی و خروجی لاگ‌ها (Backend)

ماژول متمرکز لاگ‌گیری در مسیرهای زیر قرار دارد:

- `src/server/logging/logger.ts`: پیاده‌سازی `StructuredLogger` و singleton `logger`
- `src/server/logging/redactor.ts`: پوشاندن خودکار اطلاعات حساس پیش از نوشتن روی console، فایل یا دیتابیس
- `src/server/middleware/request-logger.middleware.ts`: تولید و انتشار `X-Request-Id`، محاسبه `durationMs` و ثبت رویدادهای HTTP API
- `src/server/middleware/error.middleware.ts`: ثبت خطاهای کنترل‌نشده و کنترل‌شده Express با تفکیک پیام امن برای کلاینت و جزئیات فنی برای مدیران
- `src/server/db/postgres-pool.ts` و `src/server/db/postgres.ts`: ثبت خطاهای اتصال، کوئری و تراکنش PostgreSQL و مدیریت جدول `system_logs`

### سطوح لاگ پشتیبانی‌شده

- `ERROR`: خطاهای سرور (`5xx`)، خطاهای PostgreSQL، خطاهای فایل و استوریج، خطاهای بکاپ/بازیابی، و خطاهای startup/shutdown
- `WARN`: تلاش‌های ناموفق احراز هویت، مسدودسازی اشتراک/دسترسی، محدودیت نرخ (`429`)، خطاهای `4xx` و هشدارهای عملیاتی
- `INFO`: راه‌اندازی و خاموش‌سازی امن سرور، رویدادهای مهم API (درخواست‌های تغییر داده `POST`/`PUT`/`PATCH`/`DELETE`)، بکاپ/بازیابی موفق
- `DEBUG`: اطلاعات تکمیلی عیب‌یابی (با تنظیم `LOG_LEVEL=DEBUG`)

### فرمت JSON ساختاریافته

هر لاگ با فرمت JSON تولید شده و در `stdout` (برای `INFO`/`DEBUG`) یا `stderr` (برای `WARN`/`ERROR`) نوشته می‌شود:

```json
{
  "timestamp": "2026-11-25T10:15:30.123Z",
  "level": "ERROR",
  "message": "Database query failed",
  "module": "database",
  "operation": "pg_query_error",
  "requestId": "7f3c9f5b-...",
  "method": "POST",
  "route": "/api/v1/properties",
  "status": 500,
  "durationMs": 42,
  "userId": "user-uuid",
  "tenantId": "tenant-uuid",
  "details": {
    "code": "23505"
  }
}
```

- `stack` تنها در خروجی فایل لاگ، دیتابیس (برای مشاهده مدیران کلان پلتفرم در پنل Platform Admin) و محیط غیرتولیدی چاپ می‌شود و **هرگز** در پاسخ API به کاربران عادی یا عمومی برگردانده نمی‌شود.

---

## ۲. پوشش خطاها و ماژول‌ها

| حوزه | مسیر پوشش |
| --- | --- |
| درخواست‌ها و خطاهای API | `requestLoggerMiddleware` و `errorMiddleware` (`server.ts`) |
| اتصال، Pool، Query و Transaction در PostgreSQL | `postgres-pool.ts` (`pool.on("error")`, `query`, `exec`, `transaction`) و `postgres.ts` (`init`) |
| احراز هویت، نشست، دسترسی و محدودیت نرخ | `auth.routes.ts`, `auth.middleware.ts`, `rate-limit.middleware.ts`, `platform.routes.ts` |
| آپلود، دانلود و فایل‌های استوریج | `documents.routes.ts`, `properties.routes.ts`, `storage.service.ts` |
| بکاپ و بازیابی (Export / Import) | `platform.routes.ts` و `postgres.ts` (`importTenantBackup`) |
| راه‌اندازی، خاموش‌سازی و خطاهای فرآیند | `server.ts` (`startup`, `SIGTERM`, `SIGINT`, `uncaughtException`, `unhandledRejection`) |

---

## ۳. جلوگیری از افشای اطلاعات حساس (Redaction & Masking)

در `src/server/logging/redactor.ts` پیش از ثبت هر رویداد روی `stdout`/`stderr`، فایل چرخشی یا جدول `system_logs`، موارد زیر به‌طور خودکار با `[REDACTED]` جایگزین می‌شوند:

- گذرواژه‌ها (`password`, `passwd`, `current_password`, `new_password`, `password_hash`, `admin_password`)
- توکن‌ها و نشست‌ها (`token`, `access_token`, `refresh_token`, `session_token`, `amlak_session`, `amlak_platform_session`, توکن‌های `Bearer ...`، JWT و `plat_*`)
- هدرهای حساس (`Authorization`, `Cookie`, `Set-Cookie`, `X-Platform-Token`, `X-Support-Session-Id`)
- کلیدهای محرمانه و رشته‌های اتصال (`secret`, `private_key`, `api_key`, `DATABASE_URL` و گذرواژه داخل URLهای `postgresql://user:pass@host`)
- بافرها و محتوای خام فایل‌های آپلودشده (`Buffer`, `Uint8Array`, `fileBuffer`, `base64`, `rawBody`)
- مقادیر پارامترهای SQL در خطاهای PostgreSQL (فقط پیش‌نمایش ساختار کوئری پس از redact شدن ثبت می‌شود و آرایه مقادیر `params` هرگز لاگ نمی‌شود)

---

## ۴. جمع‌آوری لاگ در محیط تولید (Docker و systemd)

### اجرا با systemd (مطابق `DEPLOYMENT.fa.md`)

از آنجا که خروجی لاگ‌ها به‌صورت JSON خط‌به‌خط روی `stdout` و `stderr` ارسال می‌شود، `systemd-journald` آن‌ها را به‌طور خودکار جمع‌آوری می‌کند:

```bash
# مشاهده آخرین لاگ‌های سرویس
sudo journalctl -u melktak -n 200 --no-pager

# دنبال‌کردن لحظه‌ای لاگ‌ها
sudo journalctl -u melktak -f

# فیلتر خطاهای سطح ERR به بالا در journald
sudo journalctl -u melktak -p warning -n 100 --no-pager
```

### اجرا با Docker Compose (مطابق `compose.yaml`)

```bash
docker compose logs -f --tail=200 app
```

> **نکته امنیتی Nginx / reverse proxy**: پوشه `DATA_DIR` (شامل `DATA_DIR/logs` و `private_documents`) نباید به‌عنوان مسیر static توسط Nginx سرو شود.

---

## ۵. ذخیره‌سازی، چرخش (Log Rotation) و نگهداری (Retention)

1. **فایل چرخشی در سرور**:
   - مسیر: `${DATA_DIR:-./data}/logs/app.log`
   - با رسیدن حجم فایل به `LOG_MAX_FILE_BYTES` (پیش‌فرض: ۵ مگابایت)، فایل به `app.log.1` منتقل و فایل‌های قدیمی تا سقف `LOG_MAX_FILES` (پیش‌فرض: ۵ فایل) نگهداری می‌شوند.
2. **پایگاه داده (`system_logs`)**:
   - جدول عملیاتی `system_logs` در PostgreSQL با ایندکس‌های `(created_at DESC)`, `(level, created_at DESC)`, `(module, created_at DESC)`, و `request_id` ساخته می‌شود.
   - برای جلوگیری از اشباع دیسک، **هر ۶ ساعت** (و هنگام راه‌اندازی سرور) رکوردهای قدیمی‌تر از `LOG_RETENTION_DAYS` (پیش‌فرض: ۳۰ روز) و رکوردهای مازاد بر `LOG_MAX_DB_ROWS` (پیش‌فرض: ۵۰٬۰۰۰ ردیف) پاکسازی می‌شوند.
   - **تفکیک از لاگ‌های امنیتی**: پاکسازی `system_logs` **هرگز** داده‌های `audit_logs` و `support_audit_logs` را حذف نمی‌کند.

### متغیرهای محیطی اختیاری

| متغیر | مقدار پیش‌فرض | توضیح |
| --- | --- | --- |
| `LOG_LEVEL` | `INFO` | حداقل سطح خروجی console و فایل (`ERROR`, `WARN`, `INFO`, `DEBUG`) |
| `LOG_DB_LEVEL` | `INFO` | حداقل سطح ذخیره‌سازی در جدول `system_logs` |
| `LOG_RETENTION_DAYS` | `30` | مدت نگهداری ردیف‌ها در `system_logs` (روز) |
| `LOG_MAX_DB_ROWS` | `50000` | حداکثر تعداد ردیف نگهداری‌شده در `system_logs` |
| `LOG_MAX_FILE_BYTES` | `5242880` | سقف حجم هر فایل `app.log` قبل از چرخش (بایت) |
| `LOG_MAX_FILES` | `5` | تعداد فایل‌های آرشیوی چرخشی (`app.log.1` .. `app.log.N`) |

---

## ۶. مشاهده و بررسی در پنل Platform Admin

- **مسیر رابط کاربری**: بخش «گزارش خطاها و لاگ‌های سیستم (System Logs)» در پرتال مدیریت پلتفرم (`PLATFORM_PATH`)
- **APIها** (محدود به مدیر کلان پلتفرم با `requirePlatformAdmin`):
  - `GET /api/v1/platform/logs?page=1&pageSize=25&level=&module=&search=&from=&to=`
  - `GET /api/v1/platform/logs/:id`
- دسترسی کاربران عادی، مشاوران و درخواست‌های فاقد نشست پلتفرم با کد `401` مسدود شده و تلاش دسترسی غیرمجاز با سطح `WARN` ثبت می‌شود.
- جست‌وجو در پیام، `requestId`، `route` و `operation`، فیلتر سطح، ماژول، بازه زمانی و صفحه‌بندی همگی **سمت سرور** با کوئری‌های پارامتریک انجام می‌شوند و جزئیات فنی در پنجره بازشو با پوشش فیلدهای حساس و محافظت XSS (`escapeHtml`) نمایش داده می‌شوند.
