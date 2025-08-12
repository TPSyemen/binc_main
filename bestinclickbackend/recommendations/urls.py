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
    
    # Real-time personalization
    path('realtime/', views.realtime_personalization, name='realtime'),
    
    # Interaction tracking
    path('track/', views.track_recommendation_interaction, name='track'),
]
