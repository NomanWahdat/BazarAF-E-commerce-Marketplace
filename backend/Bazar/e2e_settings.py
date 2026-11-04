from .test_settings import *  # noqa: F403
IS_E2E = True
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / '.e2e.sqlite3'}}
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
CORS_ALLOWED_ORIGINS = ['http://127.0.0.1:5176', 'http://localhost:5176']
