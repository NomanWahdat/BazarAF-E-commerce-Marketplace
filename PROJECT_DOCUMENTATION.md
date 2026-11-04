# BazarAF Project Documentation

## 1. Project Overview

BazarAF is a multi-vendor e-commerce marketplace built with a Django REST Framework backend and a React/Vite frontend. The platform supports customers, vendors, admins, and riders, with features for product browsing, vendor onboarding, order management, seller approval, authentication, email verification, Google OAuth, and vendor security settings.

## 2. Technology Stack

### Backend

- Python
- Django
- Django REST Framework
- Simple JWT authentication
- Custom Django user model
- PostgreSQL in production through `DATABASE_URL`
- SQLite fallback for local development
- Gmail SMTP email sending
- Gunicorn for Railway deployment
- WhiteNoise for static files
- Optional S3-compatible media storage through `django-storages`

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router
- Lucide React icons
- i18n translation support

### Deployment

- Backend: Railway
- Frontend: Vercel
- Database: PostgreSQL recommended for production
- Media: Cloudflare R2, S3, DigitalOcean Spaces, or similar recommended for production uploads

## 3. Repository Structure

```text
BazarAF/
├── backend/
│   ├── Bazar/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── api/
│   │   └── urls.py
│   ├── home/
│   │   ├── models.py
│   │   ├── serializer.py
│   │   ├── views.py
│   │   ├── vendor_views.py
│   │   ├── admin_views.py
│   │   ├── emails.py
│   │   ├── two_factor.py
│   │   └── migrations/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── build.sh
│   ├── runtime.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── INTEGRATION_GUIDE.md
├── PRODUCTION_AUDIT.md
├── RESUME_PROJECT.md
└── PROJECT_DOCUMENTATION.md
```

## 4. Main Features

### Customer Features

- User registration and login
- Phone/email based authentication
- Google OAuth login
- Email verification using OTP and verification link
- Password reset by email
- Product browsing
- Product search and filtering
- Product detail pages
- Cart functionality
- Order checkout
- Cash on Delivery support
- Order tracking
- Profile management
- Address management
- Product reviews
- Notifications

### Vendor Features

- Seller registration/application workflow
- Shop profile management
- Vendor dashboard
- Product creation and management
- Product image uploads
- Order management
- Payout tracking
- Store policies
- Notification settings
- Two-factor authentication using TOTP
- Backup code support
- Phone/email verification tools

### Admin Features

- Seller application approval/rejection
- Product moderation
- Order operations
- Category management
- Commission management
- Vendor performance monitoring
- Review moderation
- Dashboard statistics

## 5. Backend Configuration

### Local Backend `.env` Location

The backend environment file is located at:

```text
backend/.env
```

This file must not be committed to GitHub.

### Required Backend Environment Variables

```env
SECRET_KEY=your-secure-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,bazaraf-production.up.railway.app
FRONTEND_URL=http://localhost:5173

DATABASE_URL=

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=BazaarAF <your-gmail@gmail.com>

GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### Production Backend Variables for Railway

Set these in Railway project variables:

```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=bazaraf-production.up.railway.app,localhost,127.0.0.1
FRONTEND_URL=https://your-frontend-domain.vercel.app
DATABASE_URL=your-railway-postgres-url

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=BazaarAF <your-gmail@gmail.com>

GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

Important email notes:

- `EMAIL_HOST_PASSWORD` must be a Gmail App Password, not your normal Gmail password.
- `DEFAULT_FROM_EMAIL` should use the same Gmail address as `EMAIL_HOST_USER`.
- If `EMAIL_HOST_USER` is missing, Django falls back to console email backend and real emails will not send.
- `FRONTEND_URL` controls the domain used in verification links.

## 6. Frontend Configuration

### Local Frontend Environment

Create or update:

```text
frontend/.env.local
```

Use:

```env
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### Production Frontend Variables

Set in Vercel:

```env
VITE_API_URL=https://bazaraf-production.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

## 7. Local Development Setup

### Backend Setup

From the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend local URL:

```text
http://localhost:8000
```

API local base URL:

```text
http://localhost:8000/api
```

### Frontend Setup

From the project root:

```powershell
cd frontend
npm install
npm run dev
```

Frontend local URL:

```text
http://localhost:5173
```

## 8. Common Commands

### Backend

```powershell
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
python manage.py collectstatic --noinput
```

### Frontend

```powershell
npm run dev
npm run build
```

### Git

```powershell
git status
git add .
git commit -m "Your commit message"
git push
```

## 9. Backend API Overview

Main API routes are defined in:

```text
backend/api/urls.py
```

### Authentication Routes

```text
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/2fa/verify/
POST /api/auth/logout/
POST /api/auth/google/
POST /api/auth/verify-email/
POST /api/auth/resend-verification/
POST /api/auth/request-password-reset/
POST /api/auth/reset-password/
```

### Commerce Routes

```text
GET/POST /api/products/
GET/POST /api/categories/
GET/POST /api/orders/
POST /api/orders/checkout/
GET /api/orders/track/<order_id>/
GET/POST /api/cart/
GET/POST /api/reviews/
GET/POST /api/notifications/
```

### Vendor Routes

```text
GET/POST /api/vendors/
GET/POST /api/seller-applications/
GET /api/vendor/dashboard/
POST /api/vendor/settings/2fa/...
POST /api/vendor/send-email-verification/
POST /api/vendor/send-phone-verification/
```

### Admin Routes

```text
/api/admin/dashboard/
/api/admin/seller-applications/
/api/admin/product-moderation/
/api/admin/order-operations/
/api/admin/commission-management/
/api/admin/review-moderation/
/api/admin/vendor-performance/
```

## 10. Authentication Flow

### Normal Registration

1. User submits signup form.
2. Backend validates phone, email, password, and role.
3. Backend creates user.
4. Backend generates a 6-digit email verification OTP.
5. Backend sends an email with:
   - OTP code
   - Verification link
6. Frontend redirects user to `/verify-email-pending`.
7. User enters OTP or clicks email link.
8. Backend marks `email_verified=True`.
9. User can log in.

### Login

1. User submits email/phone and password.
2. Backend finds user by email or normalized phone.
3. Backend rejects Google-only accounts from password login.
4. Backend blocks unverified email accounts and returns `requires_email_verification`.
5. Frontend redirects unverified users to `/verify-email-pending`.
6. If 2FA is enabled for vendor, backend returns 2FA challenge.
7. After success, backend returns JWT tokens.

### Google OAuth

1. Frontend receives Google credential from Google Identity Services.
2. Frontend sends credential to `/api/auth/google/`.
3. Backend validates token against `GOOGLE_CLIENT_ID`.
4. If user exists, backend marks email verified.
5. If user does not exist, backend creates a customer account with unusable password.
6. Backend returns JWT tokens.

## 11. Email Verification and OTP

Email sending code is in:

```text
backend/home/emails.py
```

Verification token logic is in:

```text
backend/home/models.py
```

Registration email send happens in:

```text
backend/home/serializer.py
```

Resend verification endpoint is in:

```text
backend/home/views.py
```

The verification email contains:

- A 6-digit OTP code
- A link like:

```text
https://frontend-domain/verify-email?email=user@example.com&otp=123456
```

## 12. Gmail SMTP Troubleshooting

If OTP emails are not sending in Railway, check these variables in Railway:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-gmail@gmail.com
EMAIL_HOST_PASSWORD=your-16-character-gmail-app-password
DEFAULT_FROM_EMAIL=BazaarAF <your-gmail@gmail.com>
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

Checklist:

- Gmail account has 2-Step Verification enabled.
- App Password was generated from Google Account security settings.
- App Password has no spaces when saved in Railway.
- `DEFAULT_FROM_EMAIL` uses the same email as `EMAIL_HOST_USER`.
- Railway service was redeployed after changing variables.
- Railway logs do not show SMTP authentication errors.

Useful local SMTP test:

```powershell
python manage.py shell -c "from django.conf import settings; from django.core.mail import send_mail; send_mail('SMTP test','Test email',settings.DEFAULT_FROM_EMAIL,[settings.EMAIL_HOST_USER],fail_silently=False); print('sent')"
```

## 13. Database

Local development uses SQLite if `DATABASE_URL` is missing.

Production should use PostgreSQL by setting:

```env
DATABASE_URL=postgresql://...
```

The settings use `dj-database-url` when `DATABASE_URL` is present.

## 14. Media and Static Files

Static files:

- `STATIC_URL=static/`
- `STATIC_ROOT=backend/staticfiles`
- WhiteNoise serves static files in production.

Media files:

- Local fallback uses `backend/media/`.
- Production should use S3-compatible storage.

Optional media variables:

```env
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_STORAGE_BUCKET_NAME=...
AWS_S3_ENDPOINT_URL=...
AWS_S3_CUSTOM_DOMAIN=...
```

## 15. Railway Deployment

Backend files used by Railway:

```text
backend/Procfile
backend/build.sh
backend/runtime.txt
backend/requirements.txt
```

Current `Procfile`:

```text
web: gunicorn Bazar.wsgi --bind 0.0.0.0:$PORT --timeout 120 --workers 1 --preload
```

Build script:

```bash
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
```

Deployment steps:

1. Push changes to GitHub.
2. Railway detects the new commit.
3. Railway installs dependencies.
4. Railway collects static files.
5. Railway runs migrations.
6. Railway starts Gunicorn.

## 16. Vercel Frontend Deployment

Frontend deployment steps:

1. Connect frontend project to Vercel.
2. Set root directory to `frontend` if needed.
3. Set build command:

```text
npm run build
```

4. Set output directory:

```text
dist
```

5. Add environment variables:

```env
VITE_API_URL=https://bazaraf-production.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 17. Security Notes

- Never commit `.env` files.
- Never commit Gmail app passwords.
- Use a strong `SECRET_KEY` in production.
- Keep `DEBUG=False` in production.
- Use PostgreSQL for production.
- Use cloud media storage for production uploads.
- Restrict Google OAuth origins and redirect URLs in Google Cloud Console.
- Keep JWT lifetimes appropriate for the app.

## 18. Known Important Files

```text
backend/Bazar/settings.py
backend/api/urls.py
backend/home/models.py
backend/home/serializer.py
backend/home/views.py
backend/home/vendor_views.py
backend/home/admin_views.py
backend/home/emails.py
backend/home/two_factor.py
frontend/src/services/api.ts
frontend/src/pages/Login.tsx
frontend/src/pages/SignUp.tsx
frontend/src/pages/VerifyEmail.tsx
frontend/src/pages/VerifyEmailPending.tsx
frontend/src/pages/SellerRegistration.tsx
```

## 19. Current Production URLs

Backend API default used by frontend production build:

```text
https://bazaraf-production.up.railway.app/api
```

Known frontend URL from settings:

```text
https://bazar-af-seven.vercel.app
```

Update these values if the deployment domains change.

## 20. Maintenance Checklist

Before pushing production changes:

- Run backend check:

```powershell
cd backend
python manage.py check
```

- Run frontend build:

```powershell
cd frontend
npm run build
```

- Check Git status:

```powershell
git status --short
```

- Avoid committing:

```text
backend/.env
frontend/.env.local
backend/db.sqlite3
backend/media/
backend/staticfiles/
```

## 21. Troubleshooting Quick Reference

### Signup succeeds but no OTP email arrives

Check:

- Railway email variables
- Gmail App Password
- `DEFAULT_FROM_EMAIL`
- Railway logs for `Failed to send email`
- Spam folder
- Whether user is already verified

### Verification link opens wrong domain

Check:

```env
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend cannot reach backend

Check:

```env
VITE_API_URL=https://your-backend-domain/api
```

Also check backend CORS settings and `FRONTEND_URL`.

### Google login fails

Check:

```env
GOOGLE_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

Also verify authorized JavaScript origins in Google Cloud Console.

### Railway app fails health check

Check:

- `Procfile`
- `SECRET_KEY`
- `DATABASE_URL`
- `ALLOWED_HOSTS`
- Build logs
- Runtime logs

## 22. Summary

BazarAF is a full-stack marketplace application with Django REST Framework and React. The core production requirements are correct environment variables, persistent PostgreSQL database, reliable SMTP settings, and matching frontend/backend URLs. The authentication system supports OTP email verification, password login, Google OAuth, JWT tokens, and vendor 2FA.
