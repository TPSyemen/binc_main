"""
API views for shopping cart functionality.
"""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from products.models import Product
from ai_models.models import UserBehaviorLog
from .models import Cart, CartItem, SavedItem
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    AddToCartSerializer,
    UpdateCartItemSerializer,
    SavedItemSerializer
)
import logging

logger = logging.getLogger(__name__)


def get_or_create_cart(user=None, session_id=None):
    """
    Get or create cart for user or session.
    """
    if user and user.is_authenticated:
        cart, created = Cart.objects.get_or_create(user=user)
    elif session_id:
        cart, created = Cart.objects.get_or_create(session_id=session_id)
    else:
        raise ValueError("Either user or session_id must be provided")
    
    return cart


class CartView(generics.RetrieveAPIView):
    """
    Get cart details with all items.
    """
    serializer_class = CartSerializer
    permission_classes = [AllowAny]
    
    def get_object(self):
        session_id = self.request.GET.get('session_id')
        
        if self.request.user.is_authenticated:
            cart, created = Cart.objects.get_or_create(user=self.request.user)
        elif session_id:
            cart, created = Cart.objects.get_or_create(session_id=session_id)
        else:
            # Return empty cart data
            return Cart()
        
        return cart


@api_view(['POST'])
@permission_classes([AllowAny])
def add_to_cart(request):
    """
    Add product to cart.
    """
    try:
        serializer = AddToCartSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        product_id = serializer.validated_data['product_id']
        quantity = serializer.validated_data['quantity']
        session_id = serializer.validated_data.get('session_id')
        
        # Get product
        product = get_object_or_404(Product, id=product_id, is_active=True)
        
        # Check stock
        if not product.in_stock:
            return Response(
                {'error': 'Product is out of stock'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if product.stock_quantity > 0 and quantity > product.stock_quantity:
            return Response(
                {'error': f'Only {product.stock_quantity} items available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create cart
        cart = get_or_create_cart(
            user=request.user if request.user.is_authenticated else None,
            session_id=session_id
        )
        
        # Add or update cart item
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={
                'quantity': quantity,
                'price_when_added': product.get_final_price()
            }
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        # Log user behavior
        if request.user.is_authenticated:
            UserBehaviorLog.objects.create(
                user=request.user,
                product=product,
                action_type='add_to_cart',
                metadata={'quantity': quantity, 'source': 'cart_api'}
            )
        
        # Return updated cart
        cart_serializer = CartSerializer(cart)
        
        return Response({
            'message': 'Product added to cart',
            'cart': cart_serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error adding to cart: {str(e)}")
        return Response(
            {'error': 'Failed to add product to cart'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([AllowAny])
def update_cart_item(request):
    """
    Update cart item quantity.
    """
    try:
        serializer = UpdateCartItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        cart_item_id = serializer.validated_data['cart_item_id']
        quantity = serializer.validated_data['quantity']
        session_id = serializer.validated_data.get('session_id')
        
        # Get cart item
        cart_item = get_object_or_404(CartItem, id=cart_item_id)
        
        # Verify ownership
        if request.user.is_authenticated:
            if cart_item.cart.user != request.user:
                return Response(
                    {'error': 'Cart item not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif session_id:
            if cart_item.cart.session_id != session_id:
                return Response(
                    {'error': 'Cart item not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'Authentication or session_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check stock
        if cart_item.product.stock_quantity > 0 and quantity > cart_item.product.stock_quantity:
            return Response(
                {'error': f'Only {cart_item.product.stock_quantity} items available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update quantity
        if quantity <= 0:
            cart_item.delete()
            message = 'Item removed from cart'
        else:
            cart_item.quantity = quantity
            cart_item.save()
            message = 'Cart item updated'
        
        # Return updated cart
        cart_serializer = CartSerializer(cart_item.cart)
        
        return Response({
            'message': message,
            'cart': cart_serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error updating cart item: {str(e)}")
        return Response(
            {'error': 'Failed to update cart item'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([AllowAny])
def remove_from_cart(request):
    """
    Remove item from cart.
    """
    try:
        cart_item_id = request.data.get('cart_item_id')
        session_id = request.data.get('session_id')
        
        if not cart_item_id:
            return Response(
                {'error': 'cart_item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get cart item
        cart_item = get_object_or_404(CartItem, id=cart_item_id)
        
        # Verify ownership
        if request.user.is_authenticated:
            if cart_item.cart.user != request.user:
                return Response(
                    {'error': 'Cart item not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif session_id:
            if cart_item.cart.session_id != session_id:
                return Response(
                    {'error': 'Cart item not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            return Response(
                {'error': 'Authentication or session_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart = cart_item.cart
        cart_item.delete()
        
        # Return updated cart
        cart_serializer = CartSerializer(cart)
        
        return Response({
            'message': 'Item removed from cart',
            'cart': cart_serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error removing from cart: {str(e)}")
        return Response(
            {'error': 'Failed to remove item from cart'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([AllowAny])
def clear_cart(request):
    """
    Clear all items from cart.
    """
    try:
        session_id = request.data.get('session_id')
        
        # Get cart
        if request.user.is_authenticated:
            cart = get_object_or_404(Cart, user=request.user)
        elif session_id:
            cart = get_object_or_404(Cart, session_id=session_id)
        else:
            return Response(
                {'error': 'Authentication or session_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clear all items
        cart.items.all().delete()
        
        # Return empty cart
        cart_serializer = CartSerializer(cart)
        
        return Response({
            'message': 'Cart cleared',
            'cart': cart_serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error clearing cart: {str(e)}")
        return Response(
            {'error': 'Failed to clear cart'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class SavedItemsView(generics.ListAPIView):
    """
    List user's saved items (wishlist).
    """
    serializer_class = SavedItemSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SavedItem.objects.filter(user=self.request.user).order_by('-saved_at')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_item(request):
    """
    Save item to wishlist.
    """
    try:
        product_id = request.data.get('product_id')
        notes = request.data.get('notes', '')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        product = get_object_or_404(Product, id=product_id, is_active=True)
        
        # Create or update saved item
        saved_item, created = SavedItem.objects.get_or_create(
            user=request.user,
            product=product,
            defaults={'notes': notes}
        )
        
        if not created:
            saved_item.notes = notes
            saved_item.save()
        
        # Log user behavior
        UserBehaviorLog.objects.create(
            user=request.user,
            product=product,
            action_type='like',
            metadata={'source': 'wishlist', 'notes': notes}
        )
        
        serializer = SavedItemSerializer(saved_item)
        
        return Response({
            'message': 'Item saved to wishlist',
            'saved_item': serializer.data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error saving item: {str(e)}")
        return Response(
            {'error': 'Failed to save item'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unsave_item(request):
    """
    Remove item from wishlist.
    """
    try:
        product_id = request.data.get('product_id')
        
        if not product_id:
            return Response(
                {'error': 'product_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        saved_item = get_object_or_404(
            SavedItem,
            user=request.user,
            product_id=product_id
        )
        
        saved_item.delete()
        
        return Response({
            'message': 'Item removed from wishlist'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error unsaving item: {str(e)}")
        return Response(
            {'error': 'Failed to remove item from wishlist'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
