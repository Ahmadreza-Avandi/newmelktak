# راهنمای PostgreSQL و استقرار ملک‌تک

این سند اتصال برنامه به PostgreSQL، تغییر انجام‌شده و روش راه‌اندازی محلی یا استقرار روی VPS را توضیح می‌دهد. مثال‌ها برای Linux و دامنه `app.example.com` هستند؛ نام‌ها و مسیرها را با محیط خود جایگزین کنید.

## خلاصه تغییر انجام‌شده

- سرور برنامه با متغیر `DATABASE_URL` به PostgreSQL واقعی متصل می‌شود. در محیط تولید، این متغیر اجباری است و برنامه به‌طور پنهانی به دیتابیس دیگری برنمی‌گردد.
- اتصال از پکیج `pg` و connection pool استفاده می‌کند. تراکنش‌ها روی یک اتصال نگه داشته می‌شوند؛ زمینه tenant نیز در همان تراکنش اعمال می‌شود.
- هنگام راه‌اندازی، ساختار جدول‌ها و تغییرات تکمیلی موجود در `src/server/db/postgres.ts` اعمال می‌شوند. این کار جدول‌های موجود را حفظ می‌کند و جدول‌ها یا ستون‌های لازم را با `IF NOT EXISTS` می‌سازد.
- PGlite در کد تست باقی مانده است؛ اجرای اصلی با تنظیم `DATABASE_URL` روی PostgreSQL انجام می‌شود.
- داده‌های قدیمی PGlite خودکار به PostgreSQL تبدیل نمی‌شوند. در این محیط دیتابیس PostgreSQL تازه ساخته شد چون داده‌ای برای انتقال لازم نبود؛ پوشه قدیمی `data/amlak_postgres` حذف نشد.
- بررسی اجرای محلی: سرور روی `http://localhost:3000` بالا آمد و `/api/v1/health` وضعیت اتصال دیتابیس را `connected` گزارش کرد.

## اجرای محلی

### پیش‌نیازها

- Node.js نسخه ۲۴ مطابق README پروژه، npm و PostgreSQL.
- PostgreSQL باید در حال اجرا باشد و یک role و database برای برنامه داشته باشد.
- `package-lock.json` در مخزن موجود است؛ وابستگی‌ها را با `npm ci --include=dev` نصب کنید. بسته‌های توسعه لازم‌اند چون سرور از `tsx` و Vite استفاده می‌کند.

### ساخت role و دیتابیس

به‌عنوان مدیر PostgreSQL، یک حساب و دیتابیس اختصاصی بسازید. برای مثال در لینوکس:

```bash
sudo -u postgres createuser --login amlak_app
sudo -u postgres psql
```

در محیط `psql` گذرواژه role را با prompt امن تنظیم و دیتابیس را بسازید:

```sql
\password amlak_app
CREATE DATABASE amlak_os OWNER amlak_app ENCODING 'UTF8';
\q
```

در نصب‌هایی که نام سرویس یا روش مدیریت PostgreSQL فرق دارد، همین کار را از ابزار مدیریت همان سرویس انجام دهید. PostgreSQL را برای اتصال برنامه روی شبکه عمومی باز نکنید.

### تنظیم محیط و شروع

```bash
cp .env.example .env
chmod 600 .env
```

فایل `.env` را ویرایش کنید و مقدار `DATABASE_URL` را به این شکل قرار دهید:

```dotenv
DATABASE_URL=postgresql://amlak_app:رمزگذرواژه-URL-encoded@127.0.0.1:55432/amlak_os
```

کاراکترهای ویژه گذرواژه در URL باید percent-encode شوند. فایل واقعی `.env` را در Git قرار ندهید. مقدار نمونه `PLATFORM_ADMIN_PASSWORD` را نیز با یک رمز تصادفی جایگزین کنید. سپس:

```bash
npm ci --include=dev
npm run lint
npm run db:start
pg_isready -h 127.0.0.1 -p 55432
npm run dev
```

پس از اجرا `http://localhost:3000` را باز کنید. سلامت برنامه و دیتابیس:

```bash
curl --fail http://127.0.0.1:3000/api/v1/health
```

`DATA_DIR` برای فایل‌های برنامه، مانند مدارک خصوصی و تصاویر ملک، است؛ دیتابیس PostgreSQL در آن ذخیره نمی‌شود. پیش‌فرض آن `./data` است. در محیط عملیاتی این مسیر را روی دیسک پایدار نگه دارید.

### محیط توسعه‌ای که در این پروژه تنظیم شد

کلاستر محلی PostgreSQL 18 در `data/postgres_local` ساخته شد، فقط روی loopback و پورت `55432` گوش می‌دهد و دیتابیس `amlak_os` و role اختصاصی `amlak_app` دارد. تنظیم پورت و سوکت در `data/postgres_local/postgresql.conf` ذخیره شده است تا startهای بعدی هم همین تنظیم را بخوانند. اتصال برنامه و رمز به‌صورت محلی در `.env` تنظیم شده است؛ فایل با مجوز `600` نگه داشته می‌شود. دیتابیس PGlite قبلی در `data/amlak_postgres` باقی مانده و دیگر برای اجرای اصلی استفاده نمی‌شود.

### شروع روزانه و توقف

هر بار از ریشه پروژه دو ترمینال باز کن. در ترمینال اول دیتابیس را روشن کن:

```bash
npm run db:start
pg_isready -h 127.0.0.1 -p 55432
```

وقتی پیام `accepting connections` دیدی، در ترمینال دوم برنامه را اجرا کن:

```bash
npm run dev
```

برنامه در `http://localhost:3000` در دسترس است. برای توقف برنامه در ترمینال خودش `Ctrl+C` بزن؛ دیتابیس روشن می‌ماند. برای توقف امن دیتابیس:

```bash
npm run db:stop
```

برای دیدن وضعیت دیتابیس از `npm run db:status` استفاده کن. اگر شروع دیتابیس خطا داد، `data/postgres_local/server.log` را بخوان. مقدار `port` در `postgresql.conf` پورت PostgreSQL را تعیین می‌کند؛ `PORT` در `.env` پورت برنامه را مشخص می‌کند.

این کلاستر داخل پوشه پروژه برای توسعه همین دستگاه است؛ آن را به اینترنت باز نکنید و برای استقرار تولیدی کپی نکنید. برای تولید از PostgreSQL مدیریت‌شده یا سرور دیتابیس جدا با TLS، دسترسی محدود، دیسک پایدار و بکاپ استفاده کنید.

## استقرار روی VPS

### ۱. آماده‌سازی سرور

یک VPS لینوکسی با دیسک پایدار، دامنه، Node.js 24، PostgreSQL، Nginx و گواهی TLS تهیه کنید. نمونه زیر فرض می‌کند مسیر برنامه `/srv/melktak/app` و کاربر سرویس `melktak` است.

```bash
sudo adduser --system --group --home /srv/melktak melktak
sudo install -d -o melktak -g melktak /srv/melktak/app
sudo install -d -m 700 -o melktak -g melktak /srv/melktak/shared/data
sudo -u melktak git clone <REPOSITORY_URL> /srv/melktak/app
```

مخزن خصوصی را با Deploy Key یا روش امن مشابه دریافت کنید؛ token را در URL یا history فرمان نگذارید. پوشه `data` را با داده داخل مخزن جایگزین دیتابیس زنده نکنید.

### ۲. آماده‌سازی PostgreSQL

بهتر است دیتابیس در سرویس مدیریت‌شده یا سرور خصوصی جدا باشد. برای PostgreSQL روی همان VPS، محدودیت‌های زیر را رعایت کنید:

- یک role و database مختص برنامه بسازید و مالکیت آن‌ها را به همان role بدهید.
- اتصال شبکه را فقط به برنامه یا subnet خصوصی مجاز کنید. PostgreSQL را روی اینترنت عمومی در دسترس قرار ندهید.
- برای اتصال راه دور، TLS را فعال کنید و گواهی سرور را اعتبارسنجی کنید.
- نام میزبان، نام دیتابیس و role را در `DATABASE_URL` وارد کنید؛ `PGSSL=true` برای اتصال TLS با بررسی گواهی در برنامه در دسترس است.
- کاربر برنامه نباید superuser باشد. برای migrationهای همین برنامه باید امکان ساخت و تغییر اشیای schema دیتابیس اختصاصی را داشته باشد.

برنامه با اولین startup ساختار SQL فعلی را ایجاد یا تکمیل می‌کند. برای اطمینان، ابتدا نسخه جدید را به دیتابیس خالی staging وصل کنید، health را بررسی و عملیات نمونه را اجرا کنید؛ سپس production را به‌روزرسانی کنید.

### ۳. تنظیم متغیرهای محیطی

فایل خارج از web root و مخزن بسازید:

```bash
sudoedit /etc/melktak.env
sudo chown root:root /etc/melktak.env
sudo chmod 600 /etc/melktak.env
```

نمونه محتوا:

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://amlak_app:URL_ENCODED_PASSWORD@db.internal:5432/amlak_os
PG_POOL_MAX=10
PGSSL=true
DATA_DIR=/srv/melktak/shared/data
PLATFORM_PATH=/replace-with-a-private-random-path
PLATFORM_ADMIN_USERNAME=platform_owner
PLATFORM_ADMIN_PASSWORD=REPLACE_WITH_A_RANDOM_SECRET
PLATFORM_ADMIN_NAME="مدیر پلتفرم"
PLATFORM_ADMIN_EMAIL=admin@example.com
TRUST_PROXY=loopback
```

نکات:

- `PLATFORM_PATH` باید یک مسیر تصادفی با یک بخش باشد؛ در تولید اجباری است.
- گذرواژه مدیر پلتفرم باید حداقل ۱۶ نویسه و حداکثر ۷۲ بایت UTF-8 باشد. مقدار نمونه را حتماً عوض کنید.
- برنامه در صورت نبودن حساب مدیر با نام تنظیم‌شده آن را می‌سازد. تغییر متغیر گذرواژه حساب موجود را خودکار عوض نمی‌کند؛ برای تغییر رمز از مسیر مدیریتی پروژه استفاده کنید.
- `DATABASE_URL` و رازها را در Git، ticket، log یا خط فرمان عمومی منتشر نکنید.

### ۴. نصب و ساخت

```bash
cd /srv/melktak/app
sudo -u melktak npm ci --include=dev
sudo -u melktak npm run lint
sudo -u melktak npm run build
```

این build رابط را می‌سازد؛ سرور همچنان از `server.ts` با `tsx` اجرا می‌شود. به همین دلیل وابستگی‌های توسعه، از جمله `tsx` و Vite، در نصب حذف نمی‌شوند.

### ۵. اجرای سرویس با systemd

فایل `/etc/systemd/system/melktak.service`:

```ini
[Unit]
Description=Melktak application
After=network.target

[Service]
Type=simple
User=melktak
Group=melktak
WorkingDirectory=/srv/melktak/app
EnvironmentFile=/etc/melktak.env
ExecStart=/usr/bin/node --import tsx server.ts
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

مسیر `node` را با خروجی `command -v node` در همان سرور تطبیق دهید. سپس:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now melktak
sudo systemctl status melktak --no-pager
sudo journalctl -u melktak -n 100 --no-pager
curl --fail http://127.0.0.1:3000/api/v1/health
```

در پاسخ health باید `database.status` برابر `connected` باشد. برنامه فعلی روی `0.0.0.0` گوش می‌دهد؛ پورت برنامه را در فایروال فقط برای localhost/Nginx در دسترس قرار دهید و آن را عمومی نکنید.

### ۶. دامنه و HTTPS با Nginx

نمونه حداقلی برای `/etc/nginx/sites-available/melktak`:

```nginx
server {
    listen 80;
    server_name app.example.com;
    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_read_timeout 120s;
    }
}
```

پیش از reload، DNS را به VPS وصل و پیکربندی را بررسی کنید:

```bash
sudo ln -s /etc/nginx/sites-available/melktak /etc/nginx/sites-enabled/melktak
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d app.example.com --redirect
curl --fail https://app.example.com/api/v1/health
```

اگر symlink از قبل موجود است آن را دوباره نسازید. فقط SSH، HTTP و HTTPS را در فایروال باز کنید؛ پورت PostgreSQL فقط روی شبکه خصوصی و پورت برنامه فقط از localhost/Nginx قابل دسترس باشد. `data` را به‌عنوان مسیر static در Nginx منتشر نکنید.

## بکاپ و بازیابی

PostgreSQL و فایل‌های آپلودشده دو نوع داده جدا هستند؛ از هر دو بکاپ بگیرید. برای dump سازگار و کامل، PostgreSQL ابزار `pg_dump` را ارائه می‌کند:

```bash
pg_dump --format=custom --no-owner --file=/secure-backup/amlak-$(date +%F).dump "$DATABASE_URL"
```

فرمان باید در محیطی اجرا شود که `DATABASE_URL` را از secret manager یا فایل محدودشده دریافت کرده باشد. بکاپ را رمزگذاری کنید، بیرون از VPS هم نگه دارید و دوره‌ای روی دیتابیس staging بازیابی را تمرین کنید. فایل‌های `DATA_DIR` را هم جداگانه، با حفظ مالکیت و مجوزها، بکاپ بگیرید.

بازیابی dump سفارشی روی دیتابیس مقصد:

```bash
createdb --owner=amlak_app amlak_restore
pg_restore --no-owner --dbname=amlak_restore /secure-backup/amlak-YYYY-MM-DD.dump
```

قبل از بازیابی production، برنامه را متوقف و صحت dump را روی یک دیتابیس موقت بررسی کنید. ساختار دیتابیس با نسخه برنامه ارتباط دارد؛ کد و بکاپ متناظر را کنار هم نگه دارید.

## انتشار نسخه جدید

1. از دیتابیس PostgreSQL و فایل‌های `DATA_DIR` بکاپ بگیرید.
2. commit یا tag انتشار و نسخه Node/npm را ثبت کنید.
3. کد را در پوشه انتشار تازه دریافت و `npm ci --include=dev`، lint و build را اجرا کنید.
4. سرویس را متوقف کنید، نسخه فعال را به‌روزرسانی و `DATA_DIR` پایدار و تنظیمات `/etc/melktak.env` را حفظ کنید.
5. سرویس را روشن کنید؛ log و health را بررسی کنید و ورود، خواندن/نوشتن رکورد و دریافت امن سند را کنترل کنید.
6. اگر startup migration خطا داد، نسخه را با همان دیتابیس production دوباره اجرا نکنید تا خطا بررسی شود. ابتدا staging یا نسخه پشتیبان را بررسی کنید؛ بازگشت کد به‌تنهایی تغییرات schema را برنمی‌گرداند.

برنامه با یک نمونه Node و pool چنداتصالی PostgreSQL طراحی شده است. برای هر استقرار یک نمونه سرور برنامه اجرا کنید، مگر اینکه هم‌زمانی چند نمونه به‌طور جداگانه ارزیابی و پیکربندی شده باشد.

## عیب‌یابی سریع

| نشانه | بررسی |
| --- | --- |
| `DATABASE_URL is required in production` | متغیر را در فایل environment سرویس ثبت و مجوز فایل را محدود کنید. |
| خطای اتصال PostgreSQL | DNS/host، پورت، نام role و دیتابیس، `pg_hba.conf`، فایروال، TLS و رمز URL-encoded را بررسی کنید. |
| `password authentication failed` | رمز role دیتابیس را به‌روز و `DATABASE_URL` را اصلاح کنید؛ فایل secret را چاپ نکنید. |
| health برابر `disconnected` یا startup ناموفق | `journalctl -u melktak` و log PostgreSQL را بررسی کنید؛ قبل از هر اقدام مخرب از DB و فایل‌ها بکاپ بگیرید. |
| خطای 502 | وضعیت systemd، پورت داخلی، Nginx و `proxy_pass` را بررسی کنید. |
| `Cannot find package tsx` یا `vite` | وابستگی‌ها را با `npm ci --include=dev` نصب کنید. |
| خطای 413 در آپلود | سقف Nginx و میزبان را بررسی کنید؛ سقف بعضی مسیرهای بارگذاری خود برنامه محدودتر است. |
| خطای `CSRF_DETECTED` یا مشکل کوکی | کلاینت و API را روی دامنه HTTPS واحد قرار دهید و هدرهای Host و Forwarded را حفظ کنید. |

این راهنما پیکربندی همین کد را مستند می‌کند؛ مراحل VPS، DNS، TLS و دیتابیس ابری باید روی زیرساخت مقصد اجرا و قبل از استفاده واقعی بررسی شوند.
