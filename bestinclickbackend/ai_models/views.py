"""
API views for AI models and user behavior tracking.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from products.models import Product
from .models import UserBehaviorLog, UserSessionInteraction
from .services import SearchService, RecommendationService, SentimentAnalysisService
from rest_framework.views import APIView
import logging
from textblob import TextBlob

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def log_user_behavior(request):
    """
    Log user behavior for AI training and personalization.
    """
    try:
        data = request.data
        
        # Validate required fields
        action_type = data.get('action_type')
        if not action_type:
            return Response(
                {'error': 'action_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create behavior log
        behavior_log = UserBehaviorLog(
            user=request.user if request.user.is_authenticated else None,
            action_type=action_type,
            metadata=data.get('metadata', {}),
            session_id=data.get('session_id', ''),
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # Add product if provided
        product_id = data.get('product_id')
        if product_id:
            try:
                product = Product.objects.get(id=product_id, is_active=True)
                behavior_log.product = product
            except Product.DoesNotExist:
                pass
        
        behavior_log.save()
        
        # Also create session interaction for real-time personalization
        if data.get('session_id'):
            UserSessionInteraction.objects.create(
                session_id=data['session_id'],
                user=request.user if request.user.is_authenticated else None,
                product=behavior_log.product,
                interaction_type=action_type,
                page_url=data.get('page_url', ''),
                referrer=data.get('referrer', ''),
                interaction_data=data.get('metadata', {})
            )
        
        return Response({'status': 'logged'}, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error logging user behavior: {str(e)}")
        return Response(
            {'error': 'Failed to log behavior'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def search_suggestions(request):
    """
    Get search suggestions based on partial query.
    """
    try:
        query = request.GET.get('q', '').strip()
        if not query:
            return Response({'suggestions': []}, status=status.HTTP_200_OK)
        
        search_service = SearchService()
        suggestions = search_service.get_search_suggestions(query)
        
        return Response({'suggestions': suggestions}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting search suggestions: {str(e)}")
        return Response(
            {'error': 'Failed to get suggestions'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_text_sentiment(request):
    """
    Analyze sentiment of provided text.
    """
    try:
        text = request.data.get('text')
        if not text:
            return Response(
                {'error': 'text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        sentiment_service = SentimentAnalysisService()
        analysis = sentiment_service.analyze_sentiment(text)
        
        return Response(analysis, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {str(e)}")
        return Response(
            {'error': 'Failed to analyze sentiment'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_behavior_analytics(request):
    """
    Get user's behavior analytics (for debugging/admin purposes).
    """
    try:
        # Get user's recent behavior
        recent_behavior = UserBehaviorLog.objects.filter(
            user=request.user,
            timestamp__gte=timezone.now() - timezone.timedelta(days=30)
        ).values('action_type').annotate(
            count=models.Count('id')
        ).order_by('-count')
        
        # Get most viewed products
        most_viewed = UserBehaviorLog.objects.filter(
            user=request.user,
            action_type='view',
            product__isnull=False
        ).values(
            'product__name', 'product__id'
        ).annotate(
            view_count=models.Count('id')
        ).order_by('-view_count')[:5]
        
        analytics = {
            'behavior_summary': list(recent_behavior),
            'most_viewed_products': list(most_viewed),
            'total_interactions': UserBehaviorLog.objects.filter(user=request.user).count()
        }
        
        return Response(analytics, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        return Response(
            {'error': 'Failed to get analytics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


from transformers import pipeline

# تحميل نموذج التحليل مرة واحدة عند بدء التشغيل
sentiment_pipeline = pipeline("sentiment-analysis")

class SentimentAnalysisView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        text = request.data.get("text", "").strip()

        if not text:
            return Response({"error": "النص مطلوب"}, status=400)

        # تحليل الشعور باستخدام نموذج ذكاء صناعي مدرب
        result = sentiment_pipeline(text)[0]
        label = result['label'].lower()  # "positive" or "negative"
        score = round(result['score'], 3)

        return Response({
            "sentiment": label,
            "confidence": score,
            "original_text": text
        })
