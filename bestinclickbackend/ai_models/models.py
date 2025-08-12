"""
Models for AI behavior tracking and machine learning data.
"""

from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product

User = get_user_model()


class UserBehaviorLog(models.Model):
    """
    Tracks detailed user interactions for AI training and personalization.
    """
    ACTION_TYPES = [
        ('view', 'Product View'),
        ('click', 'Product Click'),
        ('add_to_cart', 'Add to Cart'),
        ('like', 'Like Product'),
        ('dislike', 'Dislike Product'),
        ('search', 'Search Query'),
        ('time_on_page', 'Time Spent on Page'),
        ('compare', 'Product Comparison'),
        ('share', 'Share Product'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="User who performed the action (null for guest users)"
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Product involved in the action (null for non-product actions)"
    )
    
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Additional context data
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context like search query, comparison criteria, time spent, etc."
    )
    
    # Session tracking
    session_id = models.CharField(max_length=255, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'user_behavior_logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['product', 'action_type']),
            models.Index(fields=['session_id', 'timestamp']),
            models.Index(fields=['action_type', 'timestamp']),
        ]
    
    def __str__(self):
        user_str = self.user.username if self.user else 'Guest'
        product_str = self.product.name if self.product else 'N/A'
        return f"{user_str} - {self.action_type} - {product_str}"


class UserSessionInteraction(models.Model):
    """
    Tracks real-time session behavior for immediate personalization.
    """
    INTERACTION_TYPES = [
        ('view', 'Page View'),
        ('click', 'Click'),
        ('add_to_cart', 'Add to Cart'),
        ('search', 'Search'),
        ('filter', 'Apply Filter'),
        ('sort', 'Sort Products'),
    ]
    
    session_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPES)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Context data for real-time analysis
    page_url = models.URLField(blank=True)
    referrer = models.URLField(blank=True)
    interaction_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Specific interaction data (search terms, filters applied, etc.)"
    )
    
    class Meta:
        db_table = 'user_session_interactions'
        indexes = [
            models.Index(fields=['session_id', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['interaction_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"Session {self.session_id[:8]} - {self.interaction_type}"


class AIModelPerformance(models.Model):
    """
    Tracks AI model performance metrics for continuous improvement.
    """
    MODEL_TYPES = [
        ('recommendation', 'Recommendation Engine'),
        ('search', 'Search Enhancement'),
        ('sentiment', 'Sentiment Analysis'),
        ('comparison', 'Product Comparison'),
        ('personalization', 'Personalization'),
    ]
    
    model_type = models.CharField(max_length=20, choices=MODEL_TYPES)
    model_version = models.CharField(max_length=50)
    
    # Performance metrics
    accuracy_score = models.FloatField(null=True, blank=True)
    precision_score = models.FloatField(null=True, blank=True)
    recall_score = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    
    # Usage metrics
    total_predictions = models.PositiveIntegerField(default=0)
    successful_predictions = models.PositiveIntegerField(default=0)
    
    # Timing metrics
    average_response_time = models.FloatField(
        null=True,
        blank=True,
        help_text="Average response time in milliseconds"
    )
    
    # Additional metrics as JSON
    custom_metrics = models.JSONField(
        default=dict,
        blank=True,
        help_text="Model-specific performance metrics"
    )
    
    evaluated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ai_model_performance'
        indexes = [
            models.Index(fields=['model_type', 'evaluated_at']),
            models.Index(fields=['model_version']),
        ]
    
    def __str__(self):
        return f"{self.get_model_type_display()} v{self.model_version} - {self.evaluated_at.date()}"
