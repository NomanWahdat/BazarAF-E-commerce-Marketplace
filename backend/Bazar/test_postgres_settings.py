from .test_settings import *  # noqa: F403
import dj_database_url
DATABASES = {'default': dj_database_url.parse(os.environ['TEST_DATABASE_URL'], conn_max_age=0)}
