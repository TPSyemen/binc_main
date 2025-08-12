"""
Models for promotions and discount QR code system.
"""

from django.db import models
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from products.models import Store
import uuid
from datetime import timedelta
from django.utils import timezone

User = get_user_model()


class Promotion(models.Model):
    """
    Promotional campaigns and discounts.
    """
    DISCOUNT_TYPES = [
        ('percentage', 'Percentage'),
        ('fixed_amount', 'Fixed Amount'),
        ('buy_one_get_one', 'Buy One Get One'),
    ]
    
    name = models.CharField(max_length=200)
    description = models.TextField()
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES)
    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Percentage (0-100) or fixed amount",
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )
    
    # Validity period
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Usage limits
    max_uses = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of times this promotion can be used"
    )
    max_uses_per_user = models.PositiveIntegerField(
        default=1,
        help_text="Maximum uses per user"
    )
    current_uses = models.PositiveIntegerField(default=0)
    
    # Minimum requirements
    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Minimum order amount to apply promotion"
    )
    
    # Applicable stores (empty means all stores)
    applicable_stores = models.ManyToManyField(
        Store,
        blank=True,
        help_text="Stores where this promotion is valid (empty = all stores)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_promotions'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'promotions'
        indexes = [
            models.Index(fields=['is_active', 'start_date', 'end_date']),
            models.Index(fields=['created_by']),
        ]
    
    def __str__(self):
        return self.name
    
    def is_valid(self):
        """Check if promotion is currently valid."""
        now = timezone.now()
        return (
            self.is_active and
            self.start_date <= now <= self.end_date and
            (self.max_uses is None or self.current_uses < self.max_uses)
        )
    
    def can_be_used_by_user(self, user):
        """Check if user can use this promotion."""
        if not self.is_valid():
            return False
        
        user_usage_count = DiscountQR.objects.filter(
            promotion=self,
            generated_by_user=user,
            is_used=True
        ).count()
        
        return user_usage_count < self.max_uses_per_user


class DiscountQR(models.Model):
    """
    Master QR code for entire cart discount across multiple stores.
    """
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, related_name='qr_codes')
    generated_by_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='generated_qr_codes'
    )
    
    # QR code status
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    
    # Cart information at generation time
    digital_receipt_data = models.JSONField(
        help_text="Detailed cart info including items from different stores"
    )
    
    # Usage tracking
    generated_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'discount_qr_codes'
        indexes = [
            models.Index(fields=['generated_by_user', 'generated_at']),
            models.Index(fields=['promotion', 'is_used']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"QR Code {self.uuid} for {self.promotion.name}"
    
    def is_valid(self):
        """Check if QR code is still valid."""
        return (
            not self.is_used and
            timezone.now() < self.expires_at and
            self.promotion.is_valid()
        )
    
    def get_stores_in_cart(self):
        """Get list of stores from the digital receipt."""
        stores = set()
        for item in self.digital_receipt_data.get('items', []):
            stores.add(item.get('store_id'))
        return list(stores)


class StoreDiscountUsage(models.Model):
    """
    Tracks each store's portion of a master QR being used.
    """
    discount_qr = models.ForeignKey(
        DiscountQR,
        on_delete=models.CASCADE,
        related_name='store_usages'
    )
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    
    # Usage status for this specific store
    is_used_by_store = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    
    # Store-specific discount details
    store_cart_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Total amount for this store's items",
        default=Decimal('0.00')
    )
    discount_applied = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Actual discount amount applied for this store",
        default=Decimal('0.00')
    )
    
    # Validation by store owner
    validated_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Store owner who validated this discount"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'store_discount_usage'
        unique_together = ['discount_qr', 'store']
        indexes = [
            models.Index(fields=['discount_qr', 'is_used_by_store']),
            models.Index(fields=['store', 'used_at']),
        ]
    
    def __str__(self):
        return f"Store usage for {self.store.name} - QR {self.discount_qr.uuid}"


class PromotionUsage(models.Model):
    """
    Track individual promotion usage for analytics.
    """
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, related_name='usage_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    discount_qr = models.ForeignKey(DiscountQR, on_delete=models.CASCADE)
    
    # Usage details
    order_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'promotion_usage'
        indexes = [
            models.Index(fields=['promotion', 'used_at']),
            models.Index(fields=['user', 'used_at']),
        ]
