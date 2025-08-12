"""
Serializers for comments app.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Comment, CommentHelpfulness

User = get_user_model()


class CommentUserSerializer(serializers.ModelSerializer):
    """
    Serializer for user information in comments.
    """
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class CommentSerializer(serializers.ModelSerializer):
    """
    Serializer for reading comments.
    """
    user = CommentUserSerializer(read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    is_helpful_to_user = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'user', 'product', 'product_name', 'text', 'rating',
            'is_verified_purchase', 'helpful_votes', 'created_at',
            'updated_at', 'is_helpful_to_user'
        ]
    
    def get_is_helpful_to_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                helpfulness = CommentHelpfulness.objects.get(
                    user=request.user,
                    comment=obj
                )
                return helpfulness.is_helpful
            except CommentHelpfulness.DoesNotExist:
                return None
        return None


class CommentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating comments.
    """
    
    class Meta:
        model = Comment
        fields = ['product', 'text', 'rating']
    
    def validate(self, attrs):
        user = self.context['request'].user
        product = attrs['product']
        
        # Check if user already reviewed this product
        if Comment.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("You have already reviewed this product")
        
        return attrs


class CommentHelpfulnessSerializer(serializers.ModelSerializer):
    """
    Serializer for comment helpfulness votes.
    """
    
    class Meta:
        model = CommentHelpfulness
        fields = ['id', 'user', 'comment', 'is_helpful', 'created_at']
        read_only_fields = ['user']
