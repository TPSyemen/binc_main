"""
API views for promotions app.
"""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from products.models import Store
from .models import Promotion, DiscountQR, StoreDiscountUsage
from .serializers import (
    PromotionSerializer,
    QRGenerationRequestSerializer,
    DiscountQRSerializer,
    StoreQRValidationSerializer,
    StoreDiscountUsageSerializer
)
import logging

logger = logging.getLogger(__name__)


class PromotionListView(generics.ListAPIView):
    """
    List all active and valid promotions.
    """
    serializer_class = PromotionSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        now = timezone.now()
        return Promotion.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        ).order_by('-created_at')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_user_qr(request):
    """
    Generate a master QR code for user's cart discount.
    """
    try:
        serializer = QRGenerationRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        promotion_id = serializer.validated_data['promotion_id']
        cart_data = serializer.validated_data['cart_data']
        
        # Get promotion
        promotion = get_object_or_404(Promotion, id=promotion_id)
        
        # Check if user can use this promotion
        if not promotion.can_be_used_by_user(request.user):
            return Response(
                {'error': 'You have exceeded the usage limit for this promotion'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate cart total and validate minimum order amount
        cart_total = sum(
            float(item['price']) * int(item['quantity'])
            for item in cart_data['items']
        )
        
        if cart_total < float(promotion.minimum_order_amount):
            return Response(
                {'error': f'Minimum order amount is ${promotion.minimum_order_amount}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate QR code with 24-hour expiration
        qr_code = DiscountQR.objects.create(
            promotion=promotion,
            generated_by_user=request.user,
            expires_at=timezone.now() + timedelta(hours=24),
            digital_receipt_data=cart_data
        )
        
        # Create store usage records for each store in cart
        stores_in_cart = set(item['store_id'] for item in cart_data['items'])
        for store_id in stores_in_cart:
            store = get_object_or_404(Store, id=store_id)
            
            # Calculate store-specific cart total
            store_items = [item for item in cart_data['items'] if item['store_id'] == store_id]
            store_total = sum(
                float(item['price']) * int(item['quantity'])
                for item in store_items
            )
            
            # Calculate discount for this store
            if promotion.discount_type == 'percentage':
                discount_amount = store_total * (float(promotion.value) / 100)
            else:  # fixed_amount
                # Distribute fixed amount proportionally among stores
                total_cart_value = sum(
                    float(item['price']) * int(item['quantity'])
                    for item in cart_data['items']
                )
                store_proportion = store_total / total_cart_value
                discount_amount = float(promotion.value) * store_proportion
            
            StoreDiscountUsage.objects.create(
                discount_qr=qr_code,
                store=store,
                store_cart_total=store_total,
                discount_applied=discount_amount
            )
        
        logger.info(f"QR code generated: {qr_code.uuid} for user {request.user.username}")
        
        serializer = DiscountQRSerializer(qr_code)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error generating QR code: {str(e)}")
        return Response(
            {'error': 'Failed to generate QR code'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_store_qr(request):
    """
    Validate QR code for a specific store (store owners only).
    """
    try:
        # Ensure user is store owner
        if not request.user.is_store_owner:
            return Response(
                {'error': 'Only store owners can validate QR codes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = StoreQRValidationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        qr_code = serializer.validated_data['qr_code']
        store_id = serializer.validated_data['store_id']
        
        # Ensure store belongs to the requesting user
        store = get_object_or_404(Store, id=store_id, owner=request.user)
        
        # Get store usage record
        try:
            store_usage = StoreDiscountUsage.objects.get(
                discount_qr=qr_code,
                store=store
            )
        except StoreDiscountUsage.DoesNotExist:
            return Response(
                {'error': 'No discount record found for this store'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already used by this store
        if store_usage.is_used_by_store:
            return Response(
                {'error': 'Discount already used by this store'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark as used by store
        store_usage.is_used_by_store = True
        store_usage.used_at = timezone.now()
        store_usage.validated_by = request.user
        store_usage.save()
        
        # Check if all stores have used their portion
        all_store_usages = StoreDiscountUsage.objects.filter(discount_qr=qr_code)
        if all(usage.is_used_by_store for usage in all_store_usages):
            # Mark master QR as fully used
            qr_code.is_used = True
            qr_code.used_at = timezone.now()
            qr_code.save()
            
            # Update promotion usage count
            qr_code.promotion.current_uses += 1
            qr_code.promotion.save()
        
        logger.info(f"QR code validated by store {store.name}: {qr_code.uuid}")
        
        return Response({
            'message': 'Discount validated successfully',
            'store_usage': StoreDiscountUsageSerializer(store_usage).data,
            'qr_fully_used': qr_code.is_used
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error validating QR code: {str(e)}")
        return Response(
            {'error': 'Failed to validate QR code'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_qr_codes(request):
    """
    Get user's generated QR codes.
    """
    try:
        qr_codes = DiscountQR.objects.filter(
            generated_by_user=request.user
        ).order_by('-generated_at')
        
        serializer = DiscountQRSerializer(qr_codes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching user QR codes: {str(e)}")
        return Response(
            {'error': 'Failed to fetch QR codes'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def store_discount_history(request, store_id):
    """
    Get discount usage history for a store (store owners only).
    """
    try:
        # Ensure user owns the store
        store = get_object_or_404(Store, id=store_id, owner=request.user)
        
        store_usages = StoreDiscountUsage.objects.filter(
            store=store
        ).order_by('-created_at')
        
        serializer = StoreDiscountUsageSerializer(store_usages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching store discount history: {str(e)}")
        return Response(
            {'error': 'Failed to fetch discount history'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
