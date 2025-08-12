"""
Filters for products app.
"""

import django_filters
from .models import Product, Category, Brand, Store


class ProductFilter(django_filters.FilterSet):
    """
    Filter set for products with various filtering options.
    """
    # Price range filtering
    price_min = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    price_max = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    
    # Category filtering (including subcategories)
    category = django_filters.ModelChoiceFilter(
        queryset=Category.objects.filter(is_active=True)
    )
    
    # Brand filtering
    brand = django_filters.ModelChoiceFilter(
        queryset=Brand.objects.filter(is_active=True)
    )
    
    # Store filtering
    store = django_filters.ModelChoiceFilter(
        queryset=Store.objects.filter(is_active=True, is_verified=True)
    )
    
    # Rating filtering
    rating_min = django_filters.NumberFilter(field_name='average_rating', lookup_expr='gte')
    
    # Stock filtering
    in_stock = django_filters.BooleanFilter()
    
    # Featured products
    is_featured = django_filters.BooleanFilter()
    
    # Discount filtering
    has_discount = django_filters.BooleanFilter(
        method='filter_has_discount',
        label='Has Discount'
    )
    
    class Meta:
        model = Product
        fields = [
            'category', 'brand', 'store', 'in_stock', 'is_featured'
        ]
    
    def filter_has_discount(self, queryset, name, value):
        if value:
            return queryset.filter(discount_percentage__gt=0)
        return queryset.filter(discount_percentage=0)
