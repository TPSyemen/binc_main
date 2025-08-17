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


class UserBehavior(models.Model):
    """
    Tracks detailed user behavior for advanced recommendations.
    """
    BEHAVIOR_TYPES = [
        ('view', 'Product View'),
        ('like', 'Product Like'),
        ('unlike', 'Product Unlike'),
        ('cart_add', 'Add to Cart'),
        ('cart_remove', 'Remove from Cart'),
        ('purchase', 'Purchase'),
        ('review_positive', 'Positive Review'),
        ('review_negative', 'Negative Review'),
        ('wishlist_add', 'Add to Wishlist'),
        ('wishlist_remove', 'Remove from Wishlist'),
        ('share', 'Product Share'),
        ('compare', 'Product Compare'),
        ('search', 'Product Search'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=255, null=True, blank=True)  # For anonymous users
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    behavior_type = models.CharField(max_length=20, choices=BEHAVIOR_TYPES)
    
    # Additional context
    duration_seconds = models.PositiveIntegerField(null=True, blank=True, help_text="Time spent on product page")
    rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Rating given (1-5)")
    review_sentiment = models.FloatField(null=True, blank=True, help_text="AI-analyzed sentiment (-1 to 1)")
    search_query = models.CharField(max_length=255, null=True, blank=True)
    referrer_page = models.CharField(max_length=255, null=True, blank=True)
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_behaviors'
        indexes = [
            models.Index(fields=['user', 'behavior_type', 'timestamp']),
            models.Index(fields=['product', 'behavior_type']),
            models.Index(fields=['session_id', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]


class ProductInteractionScore(models.Model):
    """
    Aggregated interaction scores for products (updated periodically).
    """
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='ai_interaction_score')
    
    # View metrics
    total_views = models.PositiveIntegerField(default=0)
    unique_views = models.PositiveIntegerField(default=0)
    avg_view_duration = models.FloatField(default=0.0)
    
    # Engagement metrics
    total_likes = models.PositiveIntegerField(default=0)
    total_unlikes = models.PositiveIntegerField(default=0)
    like_ratio = models.FloatField(default=0.0)  # likes / (likes + unlikes)
    
    # Purchase metrics
    total_cart_adds = models.PositiveIntegerField(default=0)
    total_purchases = models.PositiveIntegerField(default=0)
    conversion_rate = models.FloatField(default=0.0)  # purchases / views
    
    # Review metrics
    avg_rating = models.FloatField(default=0.0)
    total_reviews = models.PositiveIntegerField(default=0)
    avg_sentiment = models.FloatField(default=0.0)  # AI-analyzed sentiment
    
    # Calculated scores
    popularity_score = models.FloatField(default=0.0)  # Based on views and engagement
    quality_score = models.FloatField(default=0.0)    # Based on ratings and sentiment
    trending_score = models.FloatField(default=0.0)   # Based on recent activity
    overall_score = models.FloatField(default=0.0)    # Weighted combination
    
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_interaction_scores'
        indexes = [
            models.Index(fields=['overall_score']),
            models.Index(fields=['popularity_score']),
            models.Index(fields=['trending_score']),
        ]


class UserSimilarity(models.Model):
    """
    Stores user similarity scores for collaborative filtering.
    """
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='similarities_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='similarities_as_user2')
    similarity_score = models.FloatField(help_text="Cosine similarity score (0-1)")
    common_products = models.PositiveIntegerField(default=0)
    last_calculated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_similarities'
        unique_together = ['user1', 'user2']
        indexes = [
            models.Index(fields=['user1', 'similarity_score']),
            models.Index(fields=['similarity_score']),
        ]
