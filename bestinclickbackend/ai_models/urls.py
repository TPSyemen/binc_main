"""
URL configuration for ai_models app.
"""

from django.urls import path
from . import views
from .views import SentimentAnalysisView

app_name = 'ai_models'

urlpatterns = [
    # User behavior tracking
    path('log/', views.log_user_behavior, name='log_behavior'),
    
    # Search enhancements
    path('search/suggestions/', views.search_suggestions, name='search_suggestions'),
    
    # Sentiment analysis
    path('sentiment/analyze/', views.analyze_text_sentiment, name='analyze_sentiment'),
    path('sentiment/', SentimentAnalysisView.as_view(), name='sentiment-analysis'),
    
    # User analytics
    path('analytics/user/', views.user_behavior_analytics, name='user_analytics'),
]
