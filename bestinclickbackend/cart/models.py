"""
Models for shopping cart functionality.
"""

from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product, Store
from decimal import Decimal

User = get_user_model()


class Cart(models.Model):
    """
    Shopping cart for users (both authenticated and guest users).
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='cart'
    )
    session_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True,
        help_text="Session ID for guest users"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'carts'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['session_id']),
        ]
    
    def get_total_price(self):
        """Calculate total price of all items in cart."""
        return sum(item.get_total_price() for item in self.items.all())
    
    def get_total_items(self):
        """Get total number of items in cart."""
        return sum(item.quantity for item in self.items.all())
    
    def get_stores(self):
        """Get all stores that have products in this cart."""
        return Store.objects.filter(
            products__cartitem__cart=self
        ).distinct()


class CartItem(models.Model):
    """
    Individual items in a shopping cart.
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Store price at time of adding to cart (for price change tracking)
    price_when_added = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Product price when added to cart",
        default=Decimal('0.00')
    )
    
    class Meta:
        db_table = 'cart_items'
        unique_together = ['cart', 'product']
        indexes = [
            models.Index(fields=['cart', 'added_at']),
        ]
    
    def get_total_price(self):
        """Calculate total price for this cart item."""
        return self.price_when_added * self.quantity
    
    def get_current_price_difference(self):
        """Calculate price difference since adding to cart."""
        return self.product.get_final_price() - self.price_when_added
    
    def save(self, *args, **kwargs):
        """Set price when added if not already set."""
        if not self.price_when_added:
            self.price_when_added = self.product.get_final_price()
        super().save(*args, **kwargs)


class SavedItem(models.Model):
    """
    Items saved for later by users (wishlist functionality).
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    saved_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, help_text="User notes about this saved item")
    
    class Meta:
        db_table = 'saved_items'
        unique_together = ['user', 'product']
        indexes = [
            models.Index(fields=['user', 'saved_at']),
        ]
