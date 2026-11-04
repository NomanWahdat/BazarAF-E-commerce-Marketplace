# home/apps.py
from django.apps import AppConfig

class HomeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'home'
    
    def ready(self):
        # Import signals when app is ready
        import home.signals
        # Import admin models to ensure they're registered
        import home.admin_models