# BazarAF Critical Issues and Bug Risk Report

## Scope

This report reviews likely critical frontend and backend issues based on static inspection of the current project. No application code was changed.

## Executive Summary

The project is usable as a strong marketplace foundation, but several areas should be fixed before a serious public launch. The most important risks are email verification being bypassed in registration, production media storage, Railway environment correctness, order permission/status consistency, localStorage-heavy frontend state, and production quality gaps such as placeholder assets, SEO, and noisy logs.

## Critical Backend Issues

### 1. Registration currently bypasses email verification

**Severity:** Critical

**Location:** `backend/home/views.py`

The registration view contains demo-mode behavior that marks users as email verified immediately after signup.

**Impact:**

- OTP verification may not be required for new users.
- The email verification flow becomes inconsistent.
- Users can receive tokens immediately without proving email ownership.
- This conflicts with the intended trusted marketplace flow.

**Recommended action:**

- Remove demo-mode verification bypass.
- Return `requires_email_verification=True` after signup.
- Do not issue login tokens until email is verified, unless intentionally allowing unverified accounts.

### 2. Railway email variables may still be wrong or incomplete

**Severity:** Critical

**Location:** `backend/Bazar/settings.py`, Railway variables

The backend only sends real email when `EMAIL_HOST_USER` is configured. If Railway does not have correct SMTP variables, Django may log emails or fail silently through async thread logging.

Required Railway variables:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=BazaarAF <your-gmail@gmail.com>
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

**Impact:**

- OTP emails may not send in production.
- Verification links may point to the wrong frontend URL.
- Gmail may reject emails if `DEFAULT_FROM_EMAIL` does not match the Gmail account.

**Recommended action:**

- Verify Railway variables exactly.
- Redeploy Railway after changing variables.
- Add a safe admin/test command or endpoint for SMTP health check later.

### 3. Async email function returns success before SMTP actually succeeds

**Severity:** High

**Location:** `backend/home/emails.py`

`send_email_verification_email()` returns `True` immediately after starting a background thread. If SMTP fails inside the thread, the API still reports success.

**Impact:**

- User sees “verification code sent” even when email failed.
- Debugging Railway email becomes difficult.
- Failed email delivery is only visible in logs.

**Recommended action:**

- For critical verification emails, consider synchronous send with timeout or a real background job queue.
- If keeping threads, store send failures in logs/database and expose admin diagnostics.

### 4. Production media storage may fail without S3/R2 variables

**Severity:** Critical

**Location:** `backend/Bazar/settings.py`

Media falls back to local filesystem when S3/R2 variables are missing.

**Impact:**

- Product images and seller documents can disappear after Railway redeploy/restart.
- Uploaded media may produce broken images in production.
- Seller/product experience becomes untrustworthy.

**Recommended action:**

- Configure Cloudflare R2, S3, or DigitalOcean Spaces.
- Set storage environment variables in Railway.
- Migrate existing uploads to cloud storage.

### 5. SQLite fallback is unsafe for production if `DATABASE_URL` is missing

**Severity:** Critical

**Location:** `backend/Bazar/settings.py`

If `DATABASE_URL` is absent, backend uses SQLite.

**Impact:**

- Data can be lost on redeploy.
- Poor concurrent write behavior.
- Not suitable for real marketplace orders.

**Recommended action:**

- Ensure Railway PostgreSQL is attached.
- Confirm `DATABASE_URL` exists in Railway variables.
- Do not run production without PostgreSQL.

### 6. Password reset uses inconsistent frontend URL source

**Severity:** High

**Location:** `backend/home/views.py`

Password reset uses request-provided `frontend_url` with fallback `https://bazaaraf.com`, while email verification uses `FRONTEND_URL`.

**Impact:**

- Reset links may point to wrong domain.
- A client could inject an unexpected frontend URL.

**Recommended action:**

- Use trusted `FRONTEND_URL` from environment for reset links.
- Avoid accepting frontend URL from request body in production.

### 7. Email verification endpoint has no dedicated OTP attempt limit

**Severity:** High

**Location:** `backend/home/views.py`

The endpoint accepts OTP attempts but no endpoint-specific lockout/cooldown is visible.

**Impact:**

- 6-digit OTP could be brute-forced if rate limits are not strict enough.
- User accounts may be targeted.

**Recommended action:**

- Add per-email/IP throttling for verification attempts.
- Add resend cooldown.
- Add max failed attempts per token.

### 8. Order status naming appears inconsistent

**Severity:** High

**Location:** `backend/home/views.py`, frontend order services

Backend status counts and bulk update use statuses like `picked`, while other flows use statuses like `confirmed`, `delivered`, and possibly `out for delivery` elsewhere.

**Impact:**

- Dashboard counts may not match actual order lifecycle.
- Frontend filters may miss orders.
- Vendors/admins may see confusing state transitions.

**Recommended action:**

- Define one canonical order status enum.
- Use the same statuses across models, serializers, backend actions, frontend filters, and dashboards.

### 9. Vendor order permissions should be reviewed carefully

**Severity:** High

**Location:** `backend/home/views.py`

Vendors can confirm orders if they have items in the order. In multi-vendor orders, confirming the entire order may affect items belonging to other sellers.

**Impact:**

- One vendor may change status of an order containing other vendors’ products.
- Multi-vendor fulfillment can become inaccurate.

**Recommended action:**

- Track status per `OrderItem` for vendor operations.
- Allow admin to control whole-order status.
- Vendors should only update their own items.

### 10. Debug/status endpoints and print logs exist in backend

**Severity:** Medium to High

**Location:** `backend/home/views.py`, scripts, vendor views

Some debug endpoints and print statements are present.

**Impact:**

- Logs can become noisy.
- Debug endpoints may expose internal state if permissions are not strict.
- Production monitoring becomes harder.

**Recommended action:**

- Replace prints with structured logging.
- Confirm debug endpoints require admin-only permissions.
- Remove development-only diagnostics before launch.

## Critical Frontend Issues

### 1. Tokens and user data are stored in localStorage

**Severity:** High

**Location:** `frontend/src/services/api.ts`, `frontend/src/utils/auth.ts`

Access tokens, refresh tokens, and user data are stored in `localStorage`.

**Impact:**

- Tokens are exposed to XSS if any script injection occurs.
- Long-term session security is weaker.

**Recommended action:**

- Short term: strengthen XSS protection and reduce token lifetime.
- Long term: consider httpOnly secure cookies or safer session strategy.

### 2. Cart/wishlist appear localStorage-heavy

**Severity:** Medium to High

**Location:** frontend utils/services

Wishlist and possibly cart state rely on browser localStorage.

**Impact:**

- Users lose state across devices.
- Backend cannot fully validate current price/stock before checkout unless checkout revalidates.
- Customer experience is weaker.

**Recommended action:**

- Sync cart and wishlist to backend for authenticated users.
- Revalidate price and stock during checkout.

### 3. Placeholder image file may be missing or inconsistent

**Severity:** Medium

**Location:** frontend image utilities

Frontend references `/placeholder.svg` as fallback image.

**Impact:**

- If the file is missing from `public`, broken fallback images appear.
- Product cards look unprofessional when media fails.

**Recommended action:**

- Confirm `frontend/public/placeholder.svg` exists.
- Add marketplace-branded fallback image.

### 4. Console logs/errors remain across services

**Severity:** Medium

**Location:** many frontend service files

Many service methods log errors directly using `console.error` and some still log successful loads.

**Impact:**

- Production console looks noisy.
- Internal API details may be exposed to users inspecting browser console.

**Recommended action:**

- Use centralized error handling.
- Disable verbose logs in production.
- Show user-friendly error toasts.

### 5. Frontend package name is still generic

**Severity:** Low to Medium

**Location:** `frontend/package.json`

Package name is `@figma/my-make-file`.

**Impact:**

- Looks unfinished in professional review.
- Weakens investor/developer confidence.

**Recommended action:**

- Rename to a project-specific package name like `bazaraf-frontend`.

### 6. Missing typecheck/lint/test scripts

**Severity:** Medium

**Location:** `frontend/package.json`

Only `build` and `dev` scripts are defined.

**Impact:**

- Bugs can reach production unnoticed.
- No automated quality gate.

**Recommended action:**

- Add typecheck, lint, and test scripts.
- Run them before deployments.

## Deployment and Environment Risks

### 1. Railway and frontend domains must match exactly

**Severity:** High

Check:

- `VITE_API_URL` in Vercel frontend
- `FRONTEND_URL` in Railway backend
- `ALLOWED_HOSTS` in Railway backend
- `CORS_ALLOWED_ORIGINS` backend config

**Impact:**

- Login/signup may fail because of CORS.
- Email verification links may open wrong domain.
- OAuth may fail.

### 2. Google OAuth variables must be aligned

**Severity:** High

Check:

- Backend: `GOOGLE_CLIENT_ID`
- Frontend: `VITE_GOOGLE_CLIENT_ID`
- Google Cloud authorized JavaScript origins

**Impact:**

- Continue with Google fails.
- Existing Google users cannot log in properly.

## Launch Blocking Priorities

Before public launch, fix these first:

1. Remove registration email-verification bypass.
2. Confirm Railway SMTP variables and Gmail App Password.
3. Confirm Railway `DATABASE_URL` uses PostgreSQL.
4. Configure cloud media storage.
5. Normalize order statuses across backend/frontend.
6. Secure password reset link generation.
7. Add OTP verification throttling.
8. Confirm CORS, `ALLOWED_HOSTS`, and frontend URL settings.
9. Add placeholder image asset.
10. Add frontend build/typecheck quality gate.

## Final Recommendation

The project should not be marketed as production-ready until email verification, database persistence, media storage, and order status consistency are verified in the deployed Railway/Vercel environment.
