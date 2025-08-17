"""
API views for AI-powered recommendation system.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.core.cache import cache
from .services import recommendation_service
from .serializers import (
    RecommendationRequestSerializer,
    RecommendationResponseSerializer,
    RecommendationFeedbackSerializer
)
from .models import RecommendationSession, RecommendationResult
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def general_recommendations(request):
    """
    Get general product recommendations for all users.
    Uses trending products and popular items.
    """
    try:
        serializer = RecommendationRequestSerializer(data=request.GET)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Check cache first (disabled for now)
        # cache_key = f"general_recommendations_{serializer.validated_data.get('limit', 10)}"
        # cached_result = cache.get(cache_key)
        # 
        # if cached_result:
        #     return Response(cached_result, status=status.HTTP_200_OK)
        
        # Generate general recommendations
        result = recommendation_service.get_personalized_recommendations(
            user=None,
            session_id=serializer.validated_data.get('session_id'),
            limit=serializer.validated_data.get('limit', 10),
            category_id=serializer.validated_data.get('category_id'),
            request=request
        )
        
        # Cache for 15 minutes (disabled for now)
        # cache.set(cache_key, result, 900)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error generating general recommendations: {str(e)}")
        return Response({
            'recommendations': [],
            'message': 'عذراً، حدث خطأ في جلب التوصيات. يرجى المحاولة مرة أخرى.',
            'total_count': 0,
            'session_id': None
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def personalized_recommendations(request):
    """
    Get personalized recommendations based on user behavior and preferences.
    """
    try:
        serializer = RecommendationRequestSerializer(data=request.GET)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check cache for this user (or anonymous) - disabled for now
        # user_id = request.user.id if request.user.is_authenticated else 'anonymous'
        # cache_key = f"personalized_recommendations_{user_id}_{serializer.validated_data.get('limit', 10)}"
        # cached_result = cache.get(cache_key)
        # if cached_result:
        #     return Response(cached_result, status=status.HTTP_200_OK)

        # Generate personalized recommendations
        result = recommendation_service.get_personalized_recommendations(
            user=request.user if request.user.is_authenticated else None,
            session_id=serializer.validated_data.get('session_id'),
            limit=serializer.validated_data.get('limit', 10),
            category_id=serializer.validated_data.get('category_id'),
            request=request
        )
        recommendations = result.get('recommendations', [])

        # Cache for 5 minutes (shorter for personalized) - disabled for now
        # cache.set(cache_key, result, 300)
        
        # Return the complete result from service
        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        user_info = f"user {request.user.id}" if request.user.is_authenticated else "anonymous user"
        logger.error(f"Error generating personalized recommendations for {user_info}: {str(e)}")
        # Fallback to general recommendations
        try:
            fallback_result = recommendation_service.get_personalized_recommendations(
                user=None,
                session_id=None,
                limit=10,
                request=request
            )
            return Response(fallback_result, status=status.HTTP_200_OK)
        except Exception as e2:
            logger.error(f"Error fallback to general recommendations: {str(e2)}")
            return Response(
                {'error': 'Failed to generate recommendations'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([AllowAny])
def similar_products(request, product_id):
    """
    Get products similar to a specific product.
    """
    try:
        limit = int(request.GET.get('limit', 10))
        
        result = recommendation_service.get_similar_products(
            product_id=product_id,
            limit=limit,
            user=request.user if request.user.is_authenticated else None
        )
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting similar products for {product_id}: {str(e)}")
        return Response(
            {'error': 'Failed to get similar products'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def trending_products(request):
    """
    Get currently trending products.
    """
    try:
        limit = int(request.GET.get('limit', 20))
        
        result = recommendation_service.get_trending_products(limit=limit)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting trending products: {str(e)}")
        return Response(
            {'error': 'Failed to get trending products'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def track_user_behavior(request):
    """
    Track user behavior for recommendation learning.
    """
    try:
        behavior_type = request.data.get('behavior_type')
        product_id = request.data.get('product_id')
        
        if not behavior_type or not product_id:
            return Response(
                {'error': 'behavior_type and product_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log the behavior
        success = recommendation_service.log_user_interaction(
            behavior_type=behavior_type,
            product_id=product_id,
            user=request.user if request.user.is_authenticated else None,
            session_id=request.data.get('session_id'),
            request=request,
            duration_seconds=request.data.get('duration_seconds'),
            rating=request.data.get('rating'),
            review_sentiment=request.data.get('review_sentiment'),
            search_query=request.data.get('search_query')
        )
        
        if success:
            return Response({'status': 'success'}, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to log behavior'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        logger.error(f"Error tracking user behavior: {str(e)}")
        return Response(
            {'error': 'Failed to track behavior'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def track_recommendation_interaction(request):
    """
    Track user interactions with recommended products for ML improvement.
    """
    try:
        serializer = RecommendationFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the recommendation result
        try:
            result = RecommendationResult.objects.get(
                session_id=serializer.validated_data['session_id'],
                product_id=serializer.validated_data['product_id']
            )
        except RecommendationResult.DoesNotExist:
            return Response(
                {'error': 'Recommendation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update interaction tracking
        action = serializer.validated_data['action']
        timestamp = serializer.validated_data.get('timestamp', timezone.now())
        
        if action == 'click':
            result.was_clicked = True
            result.click_timestamp = timestamp
        elif action == 'add_to_cart':
            result.was_added_to_cart = True
        elif action == 'purchase':
            result.was_purchased = True
        elif action == 'favorite':
            result.was_favorited = True
        elif action == 'compare':
            result.was_compared = True
        elif action == 'view_details':
            result.was_viewed_details = True
        elif action == 'check_stock':
            result.was_checked_stock = True
        
        result.save()
        
        # Log for ML training
        logger.info(f"Recommendation interaction: {action} for product {result.product_id} "
                   f"from session {result.session_id}")
        
        return Response({'status': 'success'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error tracking recommendation interaction: {str(e)}")
        return Response(
            {'error': 'Failed to track interaction'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def realtime_personalization(request):
    """
    Get real-time personalized content based on current session behavior.
    """
    try:
        session_id = request.GET.get('session_id')
        if not session_id:
            return Response(
                {'error': 'session_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        recommendation_service = RecommendationService()
        personalization_data = recommendation_service.get_realtime_personalization(
            user=request.user,
            session_id=session_id
        )
        
        return Response(personalization_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error generating realtime personalization: {str(e)}")
        return Response(
            {'error': 'Failed to generate personalization'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
