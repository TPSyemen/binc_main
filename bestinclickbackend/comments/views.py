"""
API views for comments app.
"""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from products.models import Product
from ai_models.services import SentimentAnalysisService
from .models import Comment, CommentHelpfulness, AISentimentAnalysisResult
from .serializers import CommentSerializer, CommentCreateSerializer, CommentHelpfulnessSerializer
import logging

logger = logging.getLogger(__name__)


class CommentListCreateView(generics.ListCreateAPIView):
    """
    List and create comments.
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        return Comment.objects.filter(is_active=True).select_related('user', 'product')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommentCreateSerializer
        return CommentSerializer
    
    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        
        # Perform sentiment analysis
        try:
            sentiment_service = SentimentAnalysisService()
            analysis = sentiment_service.analyze_sentiment(comment.text)
            
            AISentimentAnalysisResult.objects.create(
                comment=comment,
                sentiment=analysis['sentiment'],
                confidence_score=analysis['confidence_score'],
                emotion_scores=analysis['emotion_scores'],
                keywords=analysis['keywords']
            )
        except Exception as e:
            logger.error(f"Error performing sentiment analysis: {str(e)}")


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a comment.
    """
    queryset = Comment.objects.filter(is_active=True)
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only modify their own comments
        return Comment.objects.filter(user=self.request.user, is_active=True)


class ProductCommentsView(generics.ListAPIView):
    """
    List comments for a specific product.
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        product_id = self.kwargs['product_id']
        return Comment.objects.filter(
            product_id=product_id,
            is_active=True
        ).select_related('user').order_by('-created_at')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def comment_sentiment(request, pk):
    """
    Get sentiment analysis for a comment (store owners and admins only).
    """
    try:
        comment = get_object_or_404(Comment, pk=pk, is_active=True)
        
        # Check permissions - only store owners of the product's store or admins
        if not (request.user.is_admin or 
                (request.user.is_store_owner and comment.product.store.owner == request.user)):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            sentiment_result = comment.sentiment_analysis
            return Response({
                'sentiment': sentiment_result.sentiment,
                'confidence_score': sentiment_result.confidence_score,
                'emotion_scores': sentiment_result.emotion_scores,
                'keywords': sentiment_result.keywords,
                'analyzed_at': sentiment_result.analyzed_at
            }, status=status.HTTP_200_OK)
        except AISentimentAnalysisResult.DoesNotExist:
            return Response(
                {'error': 'Sentiment analysis not available'},
                status=status.HTTP_404_NOT_FOUND
            )
        
    except Exception as e:
        logger.error(f"Error getting comment sentiment: {str(e)}")
        return Response(
            {'error': 'Failed to get sentiment analysis'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_helpfulness(request, pk):
    """
    Mark a comment as helpful or not helpful.
    """
    try:
        comment = get_object_or_404(Comment, pk=pk, is_active=True)
        is_helpful = request.data.get('is_helpful')
        
        if is_helpful is None:
            return Response(
                {'error': 'is_helpful field is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update helpfulness vote
        helpfulness, created = CommentHelpfulness.objects.get_or_create(
            user=request.user,
            comment=comment,
            defaults={'is_helpful': is_helpful}
        )
        
        if not created:
            helpfulness.is_helpful = is_helpful
            helpfulness.save()
        
        # Update comment's helpful votes count
        helpful_count = CommentHelpfulness.objects.filter(
            comment=comment,
            is_helpful=True
        ).count()
        
        comment.helpful_votes = helpful_count
        comment.save(update_fields=['helpful_votes'])
        
        return Response({
            'message': 'Helpfulness vote recorded',
            'helpful_votes': helpful_count
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error recording helpfulness vote: {str(e)}")
        return Response(
            {'error': 'Failed to record vote'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
