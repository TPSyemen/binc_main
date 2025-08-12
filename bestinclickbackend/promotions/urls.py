"""
URL configuration for promotions app.
"""

from django.urls import path
from . import views

app_name = 'promotions'

urlpatterns = [
    # Promotion listings
    path('', views.PromotionListView.as_view(), name='promotion_list'),
    
    # QR code generation and validation
    path('generate-user-qr/', views.generate_user_qr, name='generate_user_qr'),
    path('validate-store-qr/', views.validate_store_qr, name='validate_store_qr'),
    
    # User QR codes
    path('my-qr-codes/', views.user_qr_codes, name='user_qr_codes'),
    
    # Store discount history
    path('stores/<int:store_id>/discount-history/', views.store_discount_history, name='store_discount_history'),
]
