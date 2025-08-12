"""
Admin configuration for ai_models app.
"""

from django.contrib import admin
from .models import UserBehaviorLog, UserSessionInteraction, AIModelPerformance


@admin.register(UserBehaviorLog)
class UserBehaviorLogAdmin(admin.ModelAdmin):
    """
    Admin for user behavior logs.
    """
    list_display = ['user', 'product', 'action_type', 'timestamp', 'session_id']
    list_filter = ['action_type', 'timestamp']
    search_fields = ['user__username', 'product__name', 'session_id']
    readonly_fields = ['timestamp']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'product')


@admin.register(UserSessionInteraction)
class UserSessionInteractionAdmin(admin.ModelAdmin):
    """
    Admin for user session interactions.
    """
    list_display = ['session_id', 'user', 'product', 'interaction_type', 'timestamp']
    list_filter = ['interaction_type', 'timestamp']
    search_fields = ['session_id', 'user__username', 'product__name']
    readonly_fields = ['timestamp']


@admin.register(AIModelPerformance)
class AIModelPerformanceAdmin(admin.ModelAdmin):
    """
    Admin for AI model performance tracking.
    """
    list_display = ['model_type', 'model_version', 'accuracy_score', 'total_predictions', 'evaluated_at']
    list_filter = ['model_type', 'evaluated_at']
    search_fields = ['model_type', 'model_version']
    readonly_fields = ['evaluated_at']
