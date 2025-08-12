"""
Models for AI-powered recommendation system.
Tracks recommendation performance and user interactions.
"""

from django.db import models
from decimal import Decimal
from django.contrib.auth import get_user_model
from products.models import Product
import uuid

User = get_user_model()


class RecommendationSession(models.Model):
    """
    Tracks recommendation sessions for performance analysis.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=255, null=True, blank=True)
    recommendation_type = models.CharField(
        max_length=50,
        choices=[
            ('general', 'General Recommendations'),
            ('personalized', 'Personalized Recommendations'),
            ('similar', 'Similar Products'),
            ('trending', 'Trending Products'),
            ('collaborative', 'Collaborative Filtering'),
            ('content_based', 'Content-Based Filtering'),
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'recommendation_sessions'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['session_id']),
        ]


class RecommendationResult(models.Model):
    """
    Stores individual recommendation results for tracking performance.
    """
    session = models.ForeignKey(RecommendationSession, on_delete=models.CASCADE, related_name='results')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    score = models.FloatField(help_text="Recommendation confidence score (0-1)")
    position = models.PositiveIntegerField(help_text="Position in recommendation list")
    algorithm_used = models.CharField(max_length=100, help_text="Algorithm that generated this recommendation")
    
    # Performance tracking
    was_clicked = models.BooleanField(default=False)
    was_added_to_cart = models.BooleanField(default=False)
    was_purchased = models.BooleanField(default=False)
    click_timestamp = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'recommendation_results'
        unique_together = ['session', 'product']
        indexes = [
            models.Index(fields=['session', 'position']),
            models.Index(fields=['product', 'score']),
        ]


class UserPreference(models.Model):
    """
    Stores learned user preferences for personalized recommendations.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='preferences')
    category = models.ForeignKey('products.Category', on_delete=models.CASCADE, null=True, blank=True)
    brand = models.ForeignKey('products.Brand', on_delete=models.CASCADE, null=True, blank=True)
    price_range_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=Decimal('0.00'))
    price_range_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=Decimal('0.00'))
    preference_score = models.FloatField(help_text="Learned preference strength (-1 to 1)")
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_preferences'
        indexes = [
            models.Index(fields=['user', 'preference_score']),
        ]
