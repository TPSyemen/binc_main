"""
URL configuration for cart app.
"""

from django.urls import path
from . import views

app_name = 'cart'

urlpatterns = [
    # Cart operations
    path('', views.CartView.as_view(), name='cart_detail'),
    path('add/', views.add_to_cart, name='add_to_cart'),
    path('update/', views.update_cart_item, name='update_cart_item'),
    path('remove/', views.remove_from_cart, name='remove_from_cart'),
    path('clear/', views.clear_cart, name='clear_cart'),

    # Saved items (wishlist)
    path('saved/', views.SavedItemsView.as_view(), name='saved_items'),
    path('save-item/', views.save_item, name='save_item'),
    path('unsave-item/', views.unsave_item, name='unsave_item'),
]
