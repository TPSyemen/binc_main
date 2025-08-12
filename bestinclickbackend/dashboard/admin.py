"""
Admin configuration for dashboard app.
"""

from django.contrib import admin
from .models import StoreAnalytics, ProductPerformance


@admin.register(StoreAnalytics)
class StoreAnalyticsAdmin(admin.ModelAdmin):
    """
    Admin for store analytics.
    """
    list_display = ['store', 'date', 'total_views', 'unique_visitors', 'conversion_rate', 'total_revenue']
    list_filter = ['date', 'store']
    search_fields = ['store__name']
    date_hierarchy = 'date'


@admin.register(ProductPerformance)
class ProductPerformanceAdmin(admin.ModelAdmin):
    """
    Admin for product performance.
    """
    list_display = ['product', 'date', 'views', 'clicks', 'add_to_cart', 'purchases']
    list_filter = ['date', 'product__store']
    search_fields = ['product__name', 'product__store__name']
    date_hierarchy = 'date'
