"""
URL configuration for dashboard app.
"""

from django.urls import path

from . import views

app_name = 'dashboard'

urlpatterns = [
    # Endpoint: بيانات المتجر الخاص بالمستخدم الحالي
    path('my-store/', views.my_store, name='my_store'),
    # Store management
    path('stores/<int:store_id>/products/', views.StoreProductsView.as_view(), name='store_products'),
    path('stores/<int:store_id>/analytics/', views.store_analytics, name='store_analytics'),
    path('stores/<int:store_id>/performance/', views.store_performance, name='store_performance'),

    # Product management
    path('products/<int:product_id>/toggle-stock/', views.toggle_product_stock, name='toggle_product_stock'),
    path('products/<int:product_id>/performance/', views.product_performance, name='product_performance'),

    # AI insights
    path('stores/<int:store_id>/ai-insights/', views.store_ai_insights, name='store_ai_insights'),
]
