"""
API views for AI-powered recommendation system.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.core.cache import cache
from ai_models.services import RecommendationService
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
        
        # Check cache first
        cache_key = f"general_recommendations_{serializer.validated_data.get('limit', 10)}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            return Response(cached_result, status=status.HTTP_200_OK)
        
        # Generate recommendations
        recommendation_service = RecommendationService()
        recommendations = recommendation_service.get_general_recommendations(
            limit=serializer.validated_data.get('limit', 10),
            category_id=serializer.validated_data.get('category_id'),
            exclude_products=serializer.validated_data.get('exclude_products', [])
        )
        
        # Create session for tracking
        session = RecommendationSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=serializer.validated_data.get('session_id'),
            recommendation_type='general'
        )
        
        # Store results
        for idx, rec in enumerate(recommendations):
            RecommendationResult.objects.create(
                session=session,
                product_id=rec['product_id'],
                score=rec['score'],
                position=idx + 1,
                algorithm_used=rec['algorithm']
            )
        
        response_data = {
            'session_id': session.id,
            'recommendations': recommendations,
            'total_count': len(recommendations),
            'algorithm_info': {
                'type': 'general',
                'description': 'Trending and popular products'
            }
        }
        
        # Cache for 15 minutes
        cache.set(cache_key, response_data, 900)
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error generating general recommendations: {str(e)}")
        return Response(
            {'error': 'Failed to generate recommendations'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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

        # Check cache for this user (or anonymous)
        user_id = request.user.id if request.user.is_authenticated else 'anonymous'
        cache_key = f"personalized_recommendations_{user_id}_{serializer.validated_data.get('limit', 10)}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response(cached_result, status=status.HTTP_200_OK)

        # Generate personalized recommendations (or general for anonymous users)
        recommendation_service = RecommendationService()
        if request.user.is_authenticated:
            recommendations = recommendation_service.get_personalized_recommendations(
                user=request.user,
                limit=serializer.validated_data.get('limit', 10),
                category_id=serializer.validated_data.get('category_id'),
                exclude_products=serializer.validated_data.get('exclude_products', [])
            )
        else:
            # For anonymous users, use general recommendations
            recommendations = recommendation_service.get_general_recommendations(
                limit=serializer.validated_data.get('limit', 10),
                category_id=serializer.validated_data.get('category_id'),
                exclude_products=serializer.validated_data.get('exclude_products', [])
            )

        # إذا لم توجد توصيات شخصية، جرب التوصيات العامة
        if not recommendations:
            general_recs = recommendation_service.get_general_recommendations(
                limit=serializer.validated_data.get('limit', 10),
                category_id=serializer.validated_data.get('category_id'),
                exclude_products=serializer.validated_data.get('exclude_products', [])
            )
            if not general_recs:
                return Response({
                    'recommendations': [],
                    'message': 'لا توجد بيانات كافية لتوليد توصيات مخصصة أو عامة.'
                }, status=status.HTTP_200_OK)
            recommendations = general_recs

        # Create session for tracking
        session = RecommendationSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_id=serializer.validated_data.get('session_id'),
            recommendation_type='personalized' if request.user.is_authenticated else 'general'
        )

        # Store results
        for idx, rec in enumerate(recommendations):
            RecommendationResult.objects.create(
                session=session,
                product_id=rec['product_id'],
                score=rec['score'],
                position=idx + 1,
                algorithm_used=rec['algorithm']
            )

        # جلب بيانات المنتجات الكاملة بنفس تنسيق ProductListView
        from products.models import Product
        from products.serializers import ProductSerializer
        product_ids = [rec['product_id'] for rec in recommendations]
        # Filter only active and complete products
        products_qs = Product.objects.filter(id__in=product_ids, is_active=True)
        products_map = {p.id: p for p in products_qs}
        serialized_products = []
        for rec in recommendations:
            product_obj = products_map.get(rec['product_id'])
            if product_obj and product_obj.slug and product_obj.image_urls:
                product_data = ProductSerializer(product_obj, context={'request': request}).data
                # Force id to be correct and not overwritten
                product_data['id'] = getattr(product_obj, 'id', None)
                product_data['score'] = rec.get('score')
                product_data['algorithm'] = rec.get('algorithm')
                serialized_products.append(product_data)
        response_data = {
            'count': len(serialized_products),
            'results': serialized_products,
            'recommendations': serialized_products,  # Add for frontend compatibility
        }

        # Cache for 5 minutes (shorter for personalized)
        cache.set(cache_key, response_data, 300)

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        user_info = f"user {request.user.id}" if request.user.is_authenticated else "anonymous user"
        logger.error(f"Error generating personalized recommendations for {user_info}: {str(e)}")
        # جرب fallback للتوصيات العامة إذا حدث خطأ
        try:
            recommendation_service = RecommendationService()
            general_recs = recommendation_service.get_general_recommendations(limit=10)
            return Response({
                'recommendations': general_recs,
                'message': 'تم عرض توصيات عامة لحدوث خطأ في التوصيات الشخصية.'
            }, status=status.HTTP_200_OK)
        except Exception as e2:
            logger.error(f"Error fallback to general recommendations: {str(e2)}")
            return Response(
                {'error': 'Failed to generate personalized or general recommendations'},
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
