# زیر بارانِ نویز

رمان پسارستاخیزی — خوانندهٔ کاملاً آفلاین و مرورگرمحور (HTML / CSS / JS خالص، بدون وابستگی خارجی).

## مشاهده آنلاین

**GitHub Pages:** https://mytesytgitacontu.github.io/under-the-noise-rain/

مخزن: https://github.com/mytesytgitacontu/under-the-noise-rain

## اجرای محلی

```bash
python3 -m http.server 8080
# سپس http://localhost:8080
```

باز کردن مستقیم `index.html` هم ممکن است؛ بعضی مرورگرها `fetch` روی `file://` را محدود می‌کنند.

## ساختار

```
├── index.html
├── manifest.webmanifest   # PWA
├── sw.js                  # Service Worker (کش آفلاین)
├── app-update.json        # تنظیمات Remote Update برای Web-to-APK
├── css/
├── js/
├── chapters/              # فصل‌های .md + manifest.json
└── assets/                # آیکون و لوگو
```

## افزودن فصل

1. فایل `chapters/chapter-NN.md` را بسازید.
2. آن را در `chapters/manifest.json` ثبت کنید.
3. روی `main` پوش کنید؛ GitHub Pages سایت را به‌روز می‌کند.

## حقوق اثر

تمام حقوق محفوظ است. جزئیات در فایل [LICENSE](LICENSE).

## حریم خصوصی

[سیاست حریم خصوصی](privacy.html) — آدرس عمومی برای اپ:

`https://mytesytgitacontu.github.io/under-the-noise-rain/privacy.html`


## اپلیکیشن اندروید

دانلود از سایت (پس از قرار دادن فایل APK):

https://mytesytgitacontu.github.io/under-the-noise-rain/releases/under-the-noise-rain.apk

فایل را در مسیر `releases/under-the-noise-rain.apk` بگذارید و پوش کنید.
