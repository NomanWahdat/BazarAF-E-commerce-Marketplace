# admin_error_handler.py - Handle admin interface database errors gracefully
import logging
from django.db import connection
from django.db.utils import OperationalError

logger = logging.getLogger(__name__)

def init_admin_interface():
    """
    Initialize admin interface settings with fallback for missing database.
    Run this during app initialization to catch any database errors.
    """
    try:
        # Try to access the admin interface theme
        from admin_interface.models import Theme
        Theme.objects.get_active()
    except OperationalError:
        # Database table doesn't exist yet (migrations not run)
        logger.warning("AdminInterface theme table not found. Using defaults.")
    except Exception as e:
        logger.warning(f"Error loading AdminInterface theme: {e}")
