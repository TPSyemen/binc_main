"""
URL configuration for products app.
"""

from django.urls import path
from . import views
from .views import StoreListCreateView, ProductReviewListCreateView
from ai_models.views import SentimentAnalysisView

app_name = 'products'

urlpatterns = [
    # AI-powered endpoints (ضعه في الأعلى لتجنب تعارض slug)
    path('analyze-sentiment/', SentimentAnalysisView.as_view(), name='sentiment_analysis'),

    # Categories and brands
    path('categories/', views.CategoryListView.as_view(), name='category_list'),
    path('brands/', views.BrandListView.as_view(), name='brand_list'),
    
    # Stores
    path('stores/', StoreListCreateView.as_view(), name='store_list_create'),
    path('stores/<slug:slug>/', views.StoreDetailView.as_view(), name='store_detail'),
    
    # Products
    path('', views.ProductListView.as_view(), name='product_list'),
    path('create/', views.ProductCreateView.as_view(), name='product_create'),
    path('<slug:slug>/', views.ProductDetailView.as_view(), name='product_detail'),
    path('<slug:slug>/update/', views.ProductUpdateView.as_view(), name='product_update'),
    path('<slug:slug>/similar/', views.similar_products, name='similar_products'),
    path('<slug:slug>/like/', views.toggle_product_like, name='toggle_product_like'),
    
    # Best products
    path('best/', views.best_products, name='best_products'),

    # Product reviews
    path('<slug:slug>/reviews/', ProductReviewListCreateView.as_view(), name='product_reviews'),
]
