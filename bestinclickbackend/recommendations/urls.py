"""
URL configuration for recommendations app.
"""

from django.urls import path
from . import views

app_name = 'recommendations'

urlpatterns = [
    # General recommendations (no auth required)
    path('general/', views.general_recommendations, name='general'),
    
    # Personalized recommendations (auth required)
    path('personalized/', views.personalized_recommendations, name='personalized'),
    
    # Similar products
    path('similar/<int:product_id>/', views.similar_products, name='similar_products'),
    
    # Trending products
    path('trending/', views.trending_products, name='trending'),
    
    # Real-time personalization
    path('realtime/', views.realtime_personalization, name='realtime'),
    
    # User behavior tracking
    path('track-behavior/', views.track_user_behavior, name='track_behavior'),
    
    # Recommendation interaction tracking
    path('track/', views.track_recommendation_interaction, name='track'),
]
