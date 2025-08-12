"""
URL configuration for comments app.
"""

from django.urls import path
from . import views

app_name = 'comments'

urlpatterns = [
    # Comment CRUD operations
    path('', views.CommentListCreateView.as_view(), name='comment_list_create'),
    path('<int:pk>/', views.CommentDetailView.as_view(), name='comment_detail'),
    
    # Product comments
    path('product/<int:product_id>/', views.ProductCommentsView.as_view(), name='product_comments'),
    
    # Sentiment analysis
    path('<int:pk>/sentiment/', views.comment_sentiment, name='comment_sentiment'),

    # Helpfulness voting
    path('<int:pk>/helpful/', views.comment_helpfulness, name='comment_helpful'),
]
