"""
Serializers for cart app.
"""

from rest_framework import serializers
from products.serializers import ProductSerializer
from .models import Cart, CartItem, SavedItem


class CartItemSerializer(serializers.ModelSerializer):
    """
    Serializer for cart items.
    """
    product = ProductSerializer(read_only=True)
    total_price = serializers.DecimalField(
        source='get_total_price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    current_price_difference = serializers.DecimalField(
        source='get_current_price_difference',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'quantity', 'price_when_added',
            'total_price', 'current_price_difference', 'added_at', 'updated_at'
        ]


class CartSerializer(serializers.ModelSerializer):
    """
    Serializer for shopping cart.
    """
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.DecimalField(
        source='get_total_price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_items = serializers.IntegerField(
        source='get_total_items',
        read_only=True
    )
    stores = serializers.SerializerMethodField()
    
    class Meta:
        model = Cart
        fields = [
            'id', 'items', 'total_price', 'total_items',
            'stores', 'created_at', 'updated_at'
        ]
    
    def get_stores(self, obj):
        stores = obj.get_stores()
        return [
            {
                'id': store.id,
                'name': store.name,
                'logo': store.logo.url if store.logo else None
            }
            for store in stores
        ]


class AddToCartSerializer(serializers.Serializer):
    """
    Serializer for adding items to cart.
    """
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, default=1)
    session_id = serializers.CharField(max_length=255, required=False)


class UpdateCartItemSerializer(serializers.Serializer):
    """
    Serializer for updating cart items.
    """
    cart_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=0)
    session_id = serializers.CharField(max_length=255, required=False)


class SavedItemSerializer(serializers.ModelSerializer):
    """
    Serializer for saved items (wishlist).
    """
    product = ProductSerializer(read_only=True)
    
    class Meta:
        model = SavedItem
        fields = ['id', 'product', 'notes', 'saved_at']
