"""
Main URL configuration for best_on_click project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# API URL patterns
api_patterns = [
    path('auth/', include('auth_app.urls')),
    path('products/', include('products.urls')),
    path('promotions/', include('promotions.urls')),
    path('user-behavior/', include('ai_models.urls')),
    path('recommendations/', include('recommendations.urls')),
    path('comparisons/', include('comparisons.urls')),
    path('comments/', include('comments.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('reports/', include('reports.urls')),
    path('cart/', include('cart.urls')),
]

urlpatterns = [
    # Django admin
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/', include(api_patterns)),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Add debug toolbar in development
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
