"""
Admin configuration for cart app.
"""

from django.contrib import admin
from .models import Cart, CartItem, SavedItem


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    """
    Admin for shopping carts.
    """
    list_display = ['id', 'user', 'session_id', 'get_total_items', 'get_total_price', 'created_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['user__username', 'session_id']
    readonly_fields = ['created_at', 'updated_at']
    
    def get_total_items(self, obj):
        return obj.get_total_items()
    get_total_items.short_description = 'Total Items'
    
    def get_total_price(self, obj):
        return f"${obj.get_total_price():.2f}"
    get_total_price.short_description = 'Total Price'


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    """
    Admin for cart items.
    """
    list_display = ['id', 'cart', 'product', 'quantity', 'price_when_added', 'get_total_price', 'added_at']
    list_filter = ['added_at', 'updated_at']
    search_fields = ['product__name', 'cart__user__username']
    readonly_fields = ['added_at', 'updated_at']
    
    def get_total_price(self, obj):
        return f"${obj.get_total_price():.2f}"
    get_total_price.short_description = 'Total Price'


@admin.register(SavedItem)
class SavedItemAdmin(admin.ModelAdmin):
    """
    Admin for saved items.
    """
    list_display = ['id', 'user', 'product', 'saved_at']
    list_filter = ['saved_at']
    search_fields = ['user__username', 'product__name']
    readonly_fields = ['saved_at']
