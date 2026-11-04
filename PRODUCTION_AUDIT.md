# BazaarAF - Production Readiness Audit

> Audit Date: May 20, 2026
> Deployment: Backend on Railway, Frontend on Vercel
> Target Market: Afghanistan

---

## CRITICAL ISSUES (Must Fix Before Launch)

### 1. Database: SQLite in Production
**Status:** 🔴 Critical

Your `settings.py` supports `DATABASE_URL` for PostgreSQL, but only if the env var is set. If Railway isn't providing a `DATABASE_URL`, you're running **SQLite in production**, which means:
- **Data loss on every redeploy** (Railway rebuilds the container, wiping the filesystem)
- **No concurrent write support** — SQLite locks the entire DB on write
- **No scalability** — cannot run multiple workers

**Fix:** Provision a PostgreSQL database on Railway (or use Railway's built-in Postgres plugin), set the `DATABASE_URL` env var, and ensure `dj-database-url` and `psycopg2-binary` are in `requirements.txt`.

---

### 2. Product Images Not Showing (Media File Storage)
**Status:** 🔴 Critical — This is your #1 visible bug

The root cause is that **media files are stored on the local filesystem** (`MEDIA_ROOT = BASE_DIR / 'media'`), but Railway's filesystem is **ephemeral** — files are wiped on every deploy/restart.

The chain of failure:
1. Vendor uploads product image → saved to `/media/products/` on Railway's container filesystem
2. Backend returns URL like `https://bazaraf-production.up.railway.app/media/products/image.jpg`
3. Railway redeploys or restarts → `/media/` directory is gone → **404 on all images**

Even without redeployment, Railway serves Django via WSGI and **Django does NOT serve media files in production** (`DEBUG=False`). Your `urls.py` has a `serve()` view for media, but it's guarded by `if settings.MEDIA_ROOT` which always evaluates true — however, `django.views.static.serve` is explicitly documented as **not for production use**.

**Fix:** You need **cloud storage for media files**. Your `requirements.txt` already has `boto3`, `django-storages`, and `s3transfer` installed. You need to:
- Configure `STORAGES` (or `DEFAULT_FILE_STORAGE`) in `settings.py` to use **AWS S3**, **Cloudflare R2**, **DigitalOcean Spaces**, or similar
- Set the appropriate env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_STORAGE_BUCKET_NAME`, etc.)
- Migrate existing media files to the bucket

---

### 3. `CORS_ALLOW_ALL_ORIGINS = True`
**Status:** 🔴 Critical Security Issue

In `settings.py` line 76, you have `CORS_ALLOW_ALL_ORIGINS = True`, which **overrides** all the specific origins you defined in `CORS_ALLOWED_ORIGINS`. This means **any website** can make authenticated API requests to your backend, enabling CSRF-like attacks and data theft.

**Fix:** Remove `CORS_ALLOW_ALL_ORIGINS = True` and rely only on the explicit `CORS_ALLOWED_ORIGINS` list.

---

### 4. `ALLOWED_HOSTS = ['*']`
**Status:** 🔴 Critical Security Issue

This allows HTTP Host header attacks. In production, this should list only your actual domains.

**Fix:** Set `ALLOWED_HOSTS` to `['bazaraf-production.up.railway.app', 'your-custom-domain.com']`.

---

### 5. Insecure Default `SECRET_KEY`
**Status:** 🔴 Critical Security Issue

`settings.py` line 16 falls back to `'django-insecure-your-secret-key-here-change-in-production'` if the env var is not set. If `SECRET_KEY` env var is missing on Railway, all JWT tokens, sessions, and CSRF tokens are signed with a known key.

**Fix:** Ensure `SECRET_KEY` is set as an env var on Railway. Remove the insecure fallback, or raise an error if missing in production.

---

### 6. No `Procfile` for Railway
**Status:** 🟡 High

Railway needs a `Procfile` (or `railway.json`) to know how to start your app. You have `build.sh` for build steps but no clear web process definition.

**Fix:** Create a `Procfile`:
```
web: gunicorn Bazar.wsgi --bind 0.0.0.0:$PORT
```

---

## HIGH PRIORITY ISSUES

### 7. No HTTPS Security Headers
**Status:** 🟡 High

Missing production security settings:
- `SECURE_SSL_REDIRECT = True`
- `SECURE_HSTS_SECONDS = 31536000`
- `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`
- `SESSION_COOKIE_SECURE = True`
- `CSRF_COOKIE_SECURE = True`
- `SECURE_BROWSER_XSS_FILTER = True`
- `SECURE_CONTENT_TYPE_NOSNIFF = True`

These should be enabled when `DEBUG=False`.

---

### 8. No API Rate Limiting / Throttling
**Status:** 🟡 High

There is no `DEFAULT_THROTTLE_CLASSES` or `DEFAULT_THROTTLE_RATES` in `REST_FRAMEWORK` settings. Critical endpoints like login, registration, password reset, and 2FA verification are vulnerable to brute-force attacks.

The 2FA verify view has a basic rate limit implementation, but other endpoints are unprotected.

**Fix:** Add DRF throttling:
```python
'DEFAULT_THROTTLE_CLASSES': [
    'rest_framework.throttling.AnonRateThrottle',
    'rest_framework.throttling.UserRateThrottle',
],
'DEFAULT_THROTTLE_RATES': {
    'anon': '30/minute',
    'user': '120/minute',
}
```

---

### 9. JWT Access Token Lifetime Too Long
**Status:** 🟡 High

`ACCESS_TOKEN_LIFETIME = 60 minutes` is too long for a production e-commerce platform. If a token is stolen, the attacker has a full hour of access.

**Fix:** Reduce to 15-30 minutes and ensure the refresh token mechanism works correctly.

---

### 10. Timezone Set to UTC Instead of Afghanistan
**Status:** 🟡 Medium

`TIME_ZONE = 'UTC'` — Afghanistan uses `Asia/Kabul` (UTC+4:30). All order timestamps, reports, and dashboard stats will show incorrect local times for users.

**Fix:** Set `TIME_ZONE = 'Asia/Kabul'`.

---

### 11. Missing Placeholder Images
**Status:** 🟡 Medium

The frontend references `/placeholder.jpg` and `/placeholder-product.png` as fallback images (in `imageUtils.ts`, `ProductCard.tsx`, etc.), but **these files don't exist** anywhere in the `frontend/` or `frontend/public/` directory. When images fail to load, users see broken image icons instead of a graceful fallback.

**Fix:** Add actual placeholder image files to the `frontend/public/` directory.

---

### 12. `index.html` — Title & SEO
**Status:** 🟡 Medium

- Page title is `"E-commerce Platform Design"` (a generic Figma export name, not "BazaarAF")
- No meta description, Open Graph tags, or favicon
- No `robots.txt` or `sitemap.xml` for SEO

**Fix:**
- Update `<title>` to `"BazaarAF - Afghanistan's Online Marketplace"`
- Add meta description, OG tags, favicon
- Add `robots.txt` and `sitemap.xml` to `public/`

---

### 13. Cart Stored in `localStorage` Only
**Status:** 🟡 Medium

Cart data is stored entirely in `localStorage`. This means:
- Cart is lost when switching devices/browsers
- No server-side cart validation (prices could change, stock could run out)
- The backend has a Cart model but it's unclear if it's being used in sync

**Fix:** Sync cart with the backend `Cart` model for authenticated users.

---

## MEDIUM PRIORITY ISSUES

### 14. Debug Logs in Production Frontend
**Status:** 🟠 Medium

There are **86+ `console.log` statements** across 17 frontend files. These leak internal data (API URLs, image processing details, navigation paths) to anyone who opens browser DevTools.

`imageUtils.ts` line 64 specifically logs every image URL processed:
```typescript
console.log('✅ Image URL processed:', { input: url, output: result });
```

**Fix:** Remove or gate all `console.log` calls behind a `DEBUG` flag before production. Use a proper logging library if needed.

---

### 15. Bare `except:` Clauses in Backend
**Status:** 🟠 Medium

Several places in `views.py` and `serializer.py` use bare `except:` which catches **all** exceptions silently, including `SystemExit` and `KeyboardInterrupt`. This hides real bugs.

Example in `views.py` line 1142:
```python
try:
    vendor = user.vendor_profile
except:
    pass
```

**Fix:** Use specific exception types (e.g., `except Vendor.DoesNotExist:` or `except AttributeError:`).

---

### 16. `_apply_filters()` Return Value Ignored
**Status:** 🟠 Medium (Bug)

In `ProductViewSet.get_queryset()` (line 1149), the result of `self._apply_filters(queryset)` is **not assigned back**:
```python
queryset = Product.objects.filter(status='approved', is_active=True)
self._apply_filters(queryset)  # ← return value is DISCARDED
return queryset
```

This means category, price, and other filters **do not work** for customers.

**Fix:** Change to `queryset = self._apply_filters(queryset)`.

---

### 17. No Error Boundary in React App
**Status:** 🟠 Medium

No `ErrorBoundary` component exists. If any component throws a runtime error, the entire app crashes with a white screen.

**Fix:** Add a React Error Boundary at the top level to catch errors and show a friendly fallback UI.

---

### 18. Email Hardcoded URLs
**Status:** 🟠 Medium

In `emails.py`, approval emails contain hardcoded URLs like `https://bazaaraf.com/login` and support contacts like `seller-support@bazaaraf.com` and `+93 700 123 456`. These may not be real/active.

**Fix:** Use the `FRONTEND_URL` env var consistently. Verify all support contact info is real.

---

### 19. `debug.log` — 3.5MB Log File Committed
**Status:** 🟠 Medium

`backend/debug.log` (3.5MB) is present in the repo. This may contain sensitive data (tracebacks, user data, etc.) and bloats the repository.

**Fix:** Add `*.log` to `.gitignore` (it's already there but the file was committed before). Remove it from Git history with `git rm --cached debug.log`.

---

### 20. Duplicate API Client Code
**Status:** 🟠 Low

There are multiple overlapping API service files:
- `api.ts` — base API + some product/category/notification calls
- `productsAPI.ts` — product/category/review calls
- `categoryApi.ts` — another product/category layer
- `vendorAPI.ts` — vendor calls

Some functions (like `getCategories`, `createProduct`, `getProducts`) are **defined in multiple files**. This creates maintenance confusion and potential inconsistencies.

**Fix:** Consolidate into a single API layer with clear separation.

---

### 21. WhiteNoise Middleware Position
**Status:** 🟠 Low

`WhiteNoiseMiddleware` is placed **after** `XFrameOptionsMiddleware` (last in the list). Django docs recommend placing it **directly after** `SecurityMiddleware` for optimal performance.

**Fix:** Move `"whitenoise.middleware.WhiteNoiseMiddleware"` to position 2 in the MIDDLEWARE list (right after SecurityMiddleware).

---

### 22. `STATICFILES_STORAGE` Deprecated
**Status:** 🟠 Low

`STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"` is the old Django < 4.2 syntax. For Django 5+/6+, use the `STORAGES` setting instead.

---

## RECOMMENDED IMPROVEMENTS (Post-Launch)

### 23. No Payment Gateway
Currently only COD (Cash on Delivery) is supported. For growth, consider integrating mobile money or bank transfer options common in Afghanistan.

### 24. No Caching Layer
No Redis/Memcached configured. The 2FA challenge tokens use Django's default cache (in-memory), which means:
- Tokens are lost on server restart
- Won't work with multiple workers/replicas

### 25. `i18n.ts` is 123KB
The translation file is massive (123KB). Consider splitting into lazy-loaded chunks per language.

### 26. No Frontend Test Suite
No test files found in the frontend. Add at least critical path tests (login, checkout, cart).

### 27. No Health Check Endpoint
Add a `/health/` endpoint for Railway monitoring that checks DB connectivity.

### 28. File Upload Size Limit
`DATA_UPLOAD_MAX_MEMORY_SIZE = 5MB` — this may be too small for vendor identity/business documents and high-res product photos.

### 29. No `React.StrictMode`
The app renders without `StrictMode`, which helps catch common bugs during development.

### 30. Wishlist is `localStorage`-Only
The Wishlist model is commented out in `models.py`. Wishlist data only persists in localStorage, so it's lost across devices.

---

## SUMMARY — Priority Action Plan

| Priority | Issue | Effort |
|----------|-------|--------|
| 🔴 P0 | Provision PostgreSQL on Railway + set `DATABASE_URL` | 30 min |
| 🔴 P0 | Set up S3/R2 cloud storage for media files | 2-3 hrs |
| 🔴 P0 | Remove `CORS_ALLOW_ALL_ORIGINS = True` | 1 min |
| 🔴 P0 | Set proper `ALLOWED_HOSTS` | 1 min |
| 🔴 P0 | Ensure `SECRET_KEY` env var is set on Railway | 5 min |
| 🟡 P1 | Add `Procfile` for Railway | 5 min |
| 🟡 P1 | Add HTTPS security headers | 15 min |
| 🟡 P1 | Add API rate limiting | 15 min |
| 🟡 P1 | Fix `_apply_filters()` bug (filters broken) | 1 min |
| 🟡 P1 | Add placeholder images | 10 min |
| 🟡 P1 | Fix `index.html` title & meta tags | 10 min |
| 🟡 P1 | Set timezone to `Asia/Kabul` | 1 min |
| 🟠 P2 | Remove `console.log` from production code | 30 min |
| 🟠 P2 | Fix bare `except:` clauses | 15 min |
| 🟠 P2 | Add React Error Boundary | 20 min |
| 🟠 P2 | Reduce JWT access token lifetime | 1 min |
| 🟠 P2 | Remove committed `debug.log` | 5 min |
| 🟠 P2 | Fix hardcoded email URLs | 10 min |
