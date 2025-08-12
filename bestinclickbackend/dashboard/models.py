"""
Models for store owner dashboard analytics and management.
"""

from django.db import models
from decimal import Decimal
from django.contrib.auth import get_user_model
from products.models import Store, Product
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class StoreAnalytics(models.Model):
    """
    Daily analytics data for stores.
    """
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='analytics')
    date = models.DateField()
    
    # Traffic metrics
    total_views = models.PositiveIntegerField(default=0)
    unique_visitors = models.PositiveIntegerField(default=0)
    product_views = models.PositiveIntegerField(default=0)
    
    # Engagement metrics
    total_clicks = models.PositiveIntegerField(default=0)
    add_to_cart_count = models.PositiveIntegerField(default=0)
    conversion_rate = models.FloatField(default=0.0)
    
    # Revenue metrics (conceptual - would integrate with payment system)
    total_orders = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # AI insights
    ai_insights = models.JSONField(
        null=True,
        blank=True,
        help_text="AI-generated insights and recommendations"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'store_analytics'
        unique_together = ['store', 'date']
        indexes = [
            models.Index(fields=['store', 'date']),
        ]


class ProductPerformance(models.Model):
    """
    Product performance metrics for store owners.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='performance')
    date = models.DateField()
    
    # Performance metrics
    views = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    add_to_cart = models.PositiveIntegerField(default=0)
    purchases = models.PositiveIntegerField(default=0)
    
    # Engagement metrics
    average_time_on_page = models.DurationField(default=timedelta(seconds=0))
    bounce_rate = models.FloatField(default=0.0)
    
    # AI recommendations
    ai_recommendations = models.JSONField(
        null=True,
        blank=True,
        help_text="AI recommendations for improving product performance"
    )
    
    class Meta:
        db_table = 'product_performance'
        unique_together = ['product', 'date']
        indexes = [
            models.Index(fields=['product', 'date']),
        ]
