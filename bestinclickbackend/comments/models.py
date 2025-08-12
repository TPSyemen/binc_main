"""
Models for product comments and reviews with AI sentiment analysis.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from products.models import Product

User = get_user_model()


class Comment(models.Model):
    """
    Product reviews and comments from users.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField(help_text="Review text content")
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    is_verified_purchase = models.BooleanField(
        default=False,
        help_text="Whether this review is from a verified purchase"
    )
    helpful_votes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'comments'
        unique_together = ['user', 'product']  # One review per user per product
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['product', 'rating']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"Review by {self.user.username} for {self.product.name}"


class CommentHelpfulness(models.Model):
    """
    Tracks which users found comments helpful.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='helpfulness_votes')
    is_helpful = models.BooleanField(help_text="True if helpful, False if not helpful")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'comment_helpfulness'
        unique_together = ['user', 'comment']


class AISentimentAnalysisResult(models.Model):
    """
    Stores AI sentiment analysis results for comments.
    """
    comment = models.OneToOneField(
        Comment, 
        on_delete=models.CASCADE, 
        related_name='sentiment_analysis'
    )
    sentiment = models.CharField(
        max_length=20,
        choices=[
            ('positive', 'Positive'),
            ('negative', 'Negative'),
            ('neutral', 'Neutral'),
        ]
    )
    confidence_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Confidence score of sentiment analysis (0-1)"
    )
    emotion_scores = models.JSONField(
        null=True,
        blank=True,
        help_text="Detailed emotion analysis (joy, anger, sadness, etc.)"
    )
    keywords = models.JSONField(
        null=True,
        blank=True,
        help_text="Key phrases and topics extracted from the comment"
    )
    analyzed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ai_sentiment_analysis'
        indexes = [
            models.Index(fields=['sentiment', 'confidence_score']),
        ]
