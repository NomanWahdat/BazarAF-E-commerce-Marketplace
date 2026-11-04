"""
URL configuration for Bazar project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf.urls.i18n import i18n_patterns
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from home.production_views import health
from django.http import Http404

def public_media(request, path):
    if path.startswith(('vendor_docs/', 'seller_applications/')):
        raise Http404
    return serve(request, path, document_root=settings.MEDIA_ROOT)

def api_root(request):
    return JsonResponse({
        'message': 'BazaarAF API',
        'endpoints': {
            'auth': '/api/auth/',
            'admin': '/admin/',
        }
    })

urlpatterns = [
    path('health/', health),
    # Non-translatable URLs (API endpoints)
    path('api/', include('api.urls')),
    path('', api_root),
] + i18n_patterns(
    # Translatable URLs (admin, main site)
    path('admin/', admin.site.urls),
    prefix_default_language=False,  # Removes default language prefix (e.g., no /en/)
)

# Serve media files (required for product images)
if settings.DEBUG and settings.MEDIA_ROOT:
    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', public_media),
    ]
