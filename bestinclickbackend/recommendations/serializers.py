"""
Serializers for recommendation API endpoints.
"""

from rest_framework import serializers
from products.serializers import ProductSerializer
from .models import RecommendationSession, RecommendationResult


class RecommendationRequestSerializer(serializers.Serializer):
    """
    Serializer for recommendation request parameters.
    """
    user_id = serializers.IntegerField(required=False)
    session_id = serializers.CharField(max_length=255, required=False)
    limit = serializers.IntegerField(default=10, min_value=1, max_value=50)
    category_id = serializers.IntegerField(required=False)
    exclude_products = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    price_min = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    price_max = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


class RecommendationResultSerializer(serializers.ModelSerializer):
    """
    Serializer for recommendation results with product details.
    """
    product = ProductSerializer(read_only=True)
    
    class Meta:
        model = RecommendationResult
        fields = ['product', 'score', 'position', 'algorithm_used']


class RecommendationResponseSerializer(serializers.Serializer):
    """
    Serializer for recommendation API response.
    """
    session_id = serializers.UUIDField()
    recommendations = RecommendationResultSerializer(many=True)
    total_count = serializers.IntegerField()
    algorithm_info = serializers.DictField()


class RecommendationFeedbackSerializer(serializers.Serializer):
    """
    Serializer for tracking user interactions with recommendations.
    """
    session_id = serializers.UUIDField()
    product_id = serializers.IntegerField()
    action = serializers.ChoiceField(choices=[
        ('click', 'Clicked'),
        ('add_to_cart', 'Added to Cart'),
        ('purchase', 'Purchased'),
    ])
    timestamp = serializers.DateTimeField(required=False)
