"""
Admin configuration for promotions app.
"""

from django.contrib import admin
from .models import Promotion, DiscountQR, StoreDiscountUsage, PromotionUsage


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    """
    Admin for promotions.
    """
    list_display = ['name', 'discount_type', 'value', 'start_date', 'end_date', 'is_active', 'current_uses']
    list_filter = ['discount_type', 'is_active', 'start_date', 'end_date']
    search_fields = ['name', 'description']
    filter_horizontal = ['applicable_stores']
    readonly_fields = ['current_uses']


@admin.register(DiscountQR)
class DiscountQRAdmin(admin.ModelAdmin):
    """
    Admin for discount QR codes.
    """
    list_display = ['uuid', 'promotion', 'generated_by_user', 'is_used', 'expires_at', 'generated_at']
    list_filter = ['is_used', 'promotion', 'generated_at']
    search_fields = ['uuid', 'generated_by_user__username']
    readonly_fields = ['uuid', 'generated_at']


@admin.register(StoreDiscountUsage)
class StoreDiscountUsageAdmin(admin.ModelAdmin):
    """
    Admin for store discount usage.
    """
    list_display = ['discount_qr', 'store', 'is_used_by_store', 'store_cart_total', 'discount_applied', 'used_at']
    list_filter = ['is_used_by_store', 'store', 'used_at']
    search_fields = ['discount_qr__uuid', 'store__name']


@admin.register(PromotionUsage)
class PromotionUsageAdmin(admin.ModelAdmin):
    """
    Admin for promotion usage tracking.
    """
    list_display = ['promotion', 'user', 'order_total', 'discount_amount', 'used_at']
    list_filter = ['promotion', 'used_at']
    search_fields = ['user__username', 'promotion__name']
