"""
Models for AI-powered product and store comparison system.
"""

from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product, Store
import uuid

User = get_user_model()


class ProductComparison(models.Model):
    """
    Stores product comparison requests and results.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    products = models.ManyToManyField(Product, related_name='comparisons')
    comparison_criteria = models.JSONField(
        help_text="Criteria used for comparison (price, features, ratings, etc.)"
    )
    ai_analysis = models.JSONField(
        help_text="AI-generated comparison analysis and insights"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_comparisons'
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]


class StoreComparison(models.Model):
    """
    Stores store comparison analysis and insights.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    stores = models.ManyToManyField(Store, related_name='comparisons')
    comparison_type = models.CharField(
        max_length=50,
        choices=[
            ('general', 'General Comparison'),
            ('category_specific', 'Category Specific'),
            ('price_analysis', 'Price Analysis'),
            ('service_quality', 'Service Quality'),
        ]
    )
    ai_insights = models.JSONField(
        help_text="AI-generated store comparison insights"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'store_comparisons'
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
