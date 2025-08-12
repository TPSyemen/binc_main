"""
Serializers for comparison API endpoints.
"""

from rest_framework import serializers
from products.serializers import ProductSerializer, StoreSerializer
from .models import ProductComparison, StoreComparison


class ProductComparisonRequestSerializer(serializers.Serializer):
    """
    Serializer for product comparison requests.
    """
    product_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=5,
        help_text="List of product IDs to compare (1-5 products)"
    )
    criteria = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Specific criteria to focus on (price, features, ratings, etc.)"
    )
    include_ai_recommendation = serializers.BooleanField(default=True)


class ProductComparisonSerializer(serializers.ModelSerializer):
    """
    Serializer for product comparison results.
    """
    products = ProductSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProductComparison
        fields = ['id', 'products', 'comparison_criteria', 'ai_analysis', 'created_at']


class StoreComparisonRequestSerializer(serializers.Serializer):
    """
    Serializer for store comparison requests.
    """
    store_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=2,
        max_length=10,
        help_text="List of store IDs to compare"
    )
    comparison_type = serializers.ChoiceField(
        choices=[
            ('general', 'General Comparison'),
            ('category_specific', 'Category Specific'),
            ('price_analysis', 'Price Analysis'),
            ('service_quality', 'Service Quality'),
        ],
        default='general'
    )
    category_id = serializers.IntegerField(required=False)


class StoreComparisonSerializer(serializers.ModelSerializer):
    """
    Serializer for store comparison results.
    """
    stores = StoreSerializer(many=True, read_only=True)
    
    class Meta:
        model = StoreComparison
        fields = ['id', 'stores', 'comparison_type', 'ai_insights', 'created_at']
