"""
Serializers for promotions app.
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import Promotion, DiscountQR, StoreDiscountUsage


class PromotionSerializer(serializers.ModelSerializer):
    """
    Serializer for promotions.
    """
    is_valid = serializers.BooleanField(read_only=True)
    applicable_store_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'description', 'discount_type', 'value',
            'start_date', 'end_date', 'max_uses', 'max_uses_per_user',
            'current_uses', 'minimum_order_amount', 'is_active',
            'is_valid', 'applicable_store_names'
        ]
    
    def get_applicable_store_names(self, obj):
        if obj.applicable_stores.exists():
            return list(obj.applicable_stores.values_list('name', flat=True))
        return ['All Stores']


class QRGenerationRequestSerializer(serializers.Serializer):
    """
    Serializer for QR code generation request.
    """
    promotion_id = serializers.IntegerField()
    cart_data = serializers.JSONField(
        help_text="Cart items with store information"
    )
    
    def validate_promotion_id(self, value):
        try:
            promotion = Promotion.objects.get(id=value)
            if not promotion.is_valid():
                raise serializers.ValidationError("Promotion is not valid or has expired")
            return value
        except Promotion.DoesNotExist:
            raise serializers.ValidationError("Promotion not found")
    
    def validate_cart_data(self, value):
        if not isinstance(value, dict) or 'items' not in value:
            raise serializers.ValidationError("Cart data must contain 'items' field")
        
        if not value['items']:
            raise serializers.ValidationError("Cart cannot be empty")
        
        # Validate each item has required fields
        for item in value['items']:
            required_fields = ['product_id', 'store_id', 'quantity', 'price']
            for field in required_fields:
                if field not in item:
                    raise serializers.ValidationError(f"Each cart item must have '{field}' field")
        
        return value


class DiscountQRSerializer(serializers.ModelSerializer):
    """
    Serializer for discount QR codes.
    """
    promotion = PromotionSerializer(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    stores_in_cart = serializers.ListField(source='get_stores_in_cart', read_only=True)
    
    class Meta:
        model = DiscountQR
        fields = [
            'uuid', 'promotion', 'is_used', 'expires_at',
            'digital_receipt_data', 'generated_at', 'used_at',
            'is_valid', 'stores_in_cart'
        ]


class StoreQRValidationSerializer(serializers.Serializer):
    """
    Serializer for store QR validation request.
    """
    qr_uuid = serializers.UUIDField()
    store_id = serializers.IntegerField()
    
    def validate(self, attrs):
        qr_uuid = attrs['qr_uuid']
        store_id = attrs['store_id']
        
        # Validate QR code exists and is valid
        try:
            qr_code = DiscountQR.objects.get(uuid=qr_uuid)
            if not qr_code.is_valid():
                raise serializers.ValidationError("QR code is invalid or expired")
        except DiscountQR.DoesNotExist:
            raise serializers.ValidationError("QR code not found")
        
        # Validate store is in the cart
        stores_in_cart = qr_code.get_stores_in_cart()
        if store_id not in stores_in_cart:
            raise serializers.ValidationError("This store is not part of the original cart")
        
        attrs['qr_code'] = qr_code
        return attrs


class StoreDiscountUsageSerializer(serializers.ModelSerializer):
    """
    Serializer for store discount usage.
    """
    store_name = serializers.CharField(source='store.name', read_only=True)
    qr_uuid = serializers.UUIDField(source='discount_qr.uuid', read_only=True)
    
    class Meta:
        model = StoreDiscountUsage
        fields = [
            'id', 'qr_uuid', 'store_name', 'is_used_by_store',
            'used_at', 'store_cart_total', 'discount_applied',
            'created_at'
        ]
