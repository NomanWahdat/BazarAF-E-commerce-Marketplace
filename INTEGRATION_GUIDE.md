# Frontend & Backend Integration Guide

## Overview
The frontend and backend are now configured to communicate with each other. Both are deployed on Vercel.

## Frontend Deployment Details
- **URL**: https://bazar-frontend-pl1r.vercel.app/
- **API Points To**: Backend at `https://bazar-backend-xmyt-git-main-bazaraf-s-projects.vercel.app/api`

## Backend Deployment Details
- **URL**: https://bazar-backend-xmyt-git-main-bazaraf-s-projects.vercel.app/
- **Frontend CORS Allowed**: https://bazar-frontend-pl1r.vercel.app/

## Environment Variables

### Backend (Vercel) - Set these in your Backend project settings
```
SECRET_KEY=<generate a new strong secret key>
DEBUG=False
ALLOWED_HOSTS=bazar-backend-xmyt-git-main-bazaraf-s-projects.vercel.app,localhost,127.0.0.1
FRONTEND_URL=https://bazar-frontend-pl1r.vercel.app

# Email Configuration (already set, but confirm these exist)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<your-gmail@gmail.com>
EMAIL_HOST_PASSWORD=<your-app-password>
DEFAULT_FROM_EMAIL=BazaarAF <noreply@bazaaraf.com>
```

### Frontend (Vercel) - Set these in your Frontend project settings
```
VITE_API_URL=https://bazar-backend-xmyt-git-main-bazaraf-s-projects.vercel.app/api
```

## Local Development Configuration

### Backend .env
```
SECRET_KEY=your-dev-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:5173

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=BazaarAF <noreply@bazaaraf.com>
```

### Frontend .env.local
```
VITE_API_URL=http://localhost:8000/api
```

## Changes Made

### Frontend Files Updated
1. ✅ **src/lib/api-client.ts** - Now uses `import.meta.env.VITE_API_URL`
2. ✅ **src/services/api.ts** - Now uses `import.meta.env.VITE_API_URL`
3. ✅ **src/services/vendorAPI.ts** - Now uses `import.meta.env.VITE_API_URL`
4. ✅ **src/pages/SellerRegistration.tsx** - Now uses `import.meta.env.VITE_API_URL`
5. ✅ **src/utils/imageUtils.ts** - Now reads from `import.meta.env.VITE_API_URL` with fallback
6. ✅ **.env** - Contains production backend URL
7. ✅ **.env.local** - Contains development backend URL
8. ✅ **.env.example** - Documentation for environment variables

### Backend Files Updated
1. ✅ **Bazar/settings.py**
   - `SECRET_KEY` - Now reads from `os.getenv('SECRET_KEY', ...)`
   - `DEBUG` - Now reads from `os.getenv('DEBUG', ...)`
   - `ALLOWED_HOSTS` - Now reads from `os.getenv('ALLOWED_HOSTS', ...)`
   - `CORS_ALLOWED_ORIGINS` - Added production frontend URL and reads from `os.getenv('FRONTEND_URL', '')`

2. ✅ **home/emails.py**
   - `send_email_verification_email()` - Now uses `os.getenv('FRONTEND_URL')` for default
   - `send_password_reset_email()` - Now uses `os.getenv('FRONTEND_URL')` for default
   - Added `import os`

3. ✅ **home/serializer.py**
   - `frontend_url` field default - Now `None` with fallback in code
   - `create()` method - Now uses `os.getenv('FRONTEND_URL')` for default
   - Added `import os`

4. ✅ **home/views.py**
   - Password reset endpoint - Now uses `os.getenv('FRONTEND_URL')` for default
   - Added `import os`

5. ✅ **home/vendor_views.py**
   - Email verification resend - Now uses `os.getenv('FRONTEND_URL')` for default
   - Added `import os`

6. ✅ **runtime.txt** - Specifies Python 3.12
7. ✅ **vercel.json** - Django WSGI configuration for Vercel
8. ✅ **requirements.txt** - Added `gunicorn` and `python-dotenv`
9. ✅ **.env.example** - Updated with FRONTEND_URL variable
10. ✅ **.vercelignore** - Excludes unnecessary files

## How It Works

### API Requests Flow
1. Frontend makes API request to `https://bazar-backend-xmyt-git-main-bazaraf-s-projects.vercel.app/api/...`
2. Backend receives request with CORS headers
3. Backend checks if request origin matches `CORS_ALLOWED_ORIGINS`
4. If match, responds with CORS headers allowing the request
5. Frontend receives data and renders it

### Email Verification Links
1. User signs up on frontend
2. Frontend sends signup request to backend with optional `frontend_url`
3. Backend generates verification token
4. Backend sends email with link: `https://bazar-frontend-pl1r.vercel.app/verify-email?token=<token>`
5. User clicks link and frontend makes API call to verify token
6. Backend validates token and marks email as verified

## Testing the Integration

1. **Push changes to GitHub**
   ```
   cd frontend && git push origin main
   cd backend && git push origin main
   ```

2. **Trigger Vercel redeploy** by pushing to main branch (auto-deploy enabled)

3. **Add Environment Variables to Vercel Dashboard**
   - Go to each project in Vercel
   - Settings → Environment Variables
   - Add the variables listed above

4. **Test the API Connection**
   - Open frontend: https://bazar-frontend-pl1r.vercel.app/
   - Try signing up or logging in
   - Check browser console for API errors
   - Verify backend receives requests

5. **Check Email Verification**
   - Verify email sends correctly (check Gmail account)
   - Click verification link
   - Confirm email is marked as verified on backend

## Troubleshooting

### CORS Errors
- Check if `CORS_ALLOWED_ORIGINS` includes the frontend URL
- Verify `FRONTEND_URL` environment variable is set correctly
- Check browser console for specific CORS error messages

### API Requests Failing
- Verify `VITE_API_URL` is set correctly in frontend
- Check if backend is running and accessible
- Look at backend logs in Vercel dashboard

### Email Verification Links Not Working
- Verify `FRONTEND_URL` is set correctly in backend
- Check email for correct link format
- Test verification URL in browser directly

## Notes
- Static database (SQLite) will reset with each backend deployment on Vercel
- Consider using PostgreSQL for production data persistence
- Keep `.env` files secure - never commit them
- Use strong SECRET_KEY for production
