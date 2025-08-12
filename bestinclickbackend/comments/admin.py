"""
Admin configuration for comments app.
"""

from django.contrib import admin
from .models import Comment, CommentHelpfulness, AISentimentAnalysisResult


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """
    Admin for comments.
    """
    list_display = ['user', 'product', 'rating', 'is_verified_purchase', 'helpful_votes', 'created_at', 'is_active']
    list_filter = ['rating', 'is_verified_purchase', 'is_active', 'created_at']
    search_fields = ['user__username', 'product__name', 'text']
    readonly_fields = ['helpful_votes', 'created_at', 'updated_at']


@admin.register(CommentHelpfulness)
class CommentHelpfulnessAdmin(admin.ModelAdmin):
    """
    Admin for comment helpfulness votes.
    """
    list_display = ['user', 'comment', 'is_helpful', 'created_at']
    list_filter = ['is_helpful', 'created_at']
    search_fields = ['user__username', 'comment__text']


@admin.register(AISentimentAnalysisResult)
class AISentimentAnalysisResultAdmin(admin.ModelAdmin):
    """
    Admin for AI sentiment analysis results.
    """
    list_display = ['comment', 'sentiment', 'confidence_score', 'analyzed_at']
    list_filter = ['sentiment', 'analyzed_at']
    search_fields = ['comment__text']
    readonly_fields = ['analyzed_at']
