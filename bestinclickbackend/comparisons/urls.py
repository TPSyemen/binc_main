"""
URL configuration for comparisons app.
"""

from django.urls import path
from . import views

app_name = 'comparisons'

urlpatterns = [
    # Product comparison
    path('products/', views.compare_products, name='compare_products'),
    path('products/<int:pk>/', views.compare_product_detail, name='compare_product_detail'),
    
    # Store comparison
    path('stores/', views.compare_stores, name='compare_stores'),
    
    # Comparison history
    path('history/', views.get_comparison_history, name='comparison_history'),
]
