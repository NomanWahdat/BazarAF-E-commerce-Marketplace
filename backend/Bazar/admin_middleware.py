# Bazar/admin_middleware.py - Middleware to handle admin interface database errors
import logging
from django.db.utils import OperationalError, ProgrammingError
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class AdminDatabaseErrorMiddleware:
    """
    Middleware to catch database errors in admin interface and provide helpful error messages.
    This allows the admin login page to work even if migrations haven't been run yet.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except (OperationalError, ProgrammingError) as e:
            # If it's an admin request and database error, return helpful message
            if request.path.startswith('/admin'):
                logger.error(f"Database error in admin: {e}")
                
                if request.path == '/admin/login/':
                    # For login page, we can still show the login form
                    # Return the original response if it has one
                    try:
                        return self.get_response(request)
                    except:
                        return JsonResponse({
                            'error': 'Database not initialized',
                            'message': 'Please run migrations: python manage.py migrate'
                        }, status=500)
            
            raise
