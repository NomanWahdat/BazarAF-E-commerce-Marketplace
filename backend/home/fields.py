from django.conf import settings
from django.db import models


class EncryptedTextField(models.TextField):
    """Encrypt TOTP secrets at rest; the key belongs in the secret manager."""
    def from_db_value(self, value, expression, connection):
        if value and value.startswith('fernet:'):
            from cryptography.fernet import Fernet
            return Fernet(settings.FIELD_ENCRYPTION_KEY.encode()).decrypt(value[7:].encode()).decode()
        return value

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value and settings.FIELD_ENCRYPTION_KEY and not value.startswith('fernet:'):
            from cryptography.fernet import Fernet
            return 'fernet:' + Fernet(settings.FIELD_ENCRYPTION_KEY.encode()).encrypt(value.encode()).decode()
        return value
