"""Isolated tests: never read credentials or connect to an existing database."""
import os
os.environ['PYTHON_DOTENV_DISABLED'] = '1'
os.environ['DEBUG'] = 'True'
os.environ['SECRET_KEY'] = 'test-only-secret-key-not-valid-for-production-0123456789'
os.environ['DATABASE_URL'] = ''
os.environ['AWS_ACCESS_KEY_ID'] = ''
os.environ['AWS_S3_ENDPOINT_URL'] = ''
os.environ['EMAIL_HOST_USER'] = ''
from .settings import *  # noqa: F403,E402
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
ALLOWED_HOSTS = ['testserver', 'localhost']
SECURE_SSL_REDIRECT = False
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
REST_FRAMEWORK = {**REST_FRAMEWORK, 'DEFAULT_THROTTLE_CLASSES': []}
