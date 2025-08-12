"""
API views for AI-powered comparison system.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from products.models import Product, Store
from ai_models.services import ComparisonService
from .serializers import (
    ProductComparisonRequestSerializer,
    ProductComparisonSerializer,
    StoreComparisonRequestSerializer,
    StoreComparisonSerializer
)
from .models import ProductComparison, StoreComparison
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def compare_products(request):
    """
    Compare multiple products using AI analysis.
    """
    try:
        serializer = ProductComparisonRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        product_ids = serializer.validated_data['product_ids']
        criteria = serializer.validated_data.get('criteria', [])
        include_ai_recommendation = serializer.validated_data.get('include_ai_recommendation', True)

        # دعم إرسال id أو slug
        resolved_ids = []
        for pid in product_ids:
            # إذا كان رقم صحيح، استخدمه مباشرة
            try:
                resolved_ids.append(int(pid))
                continue
            except (ValueError, TypeError):
                pass
            # إذا كان نص (slug)، جلب id المنتج
            prod = Product.objects.filter(slug=pid, is_active=True).first()
            if prod:
                resolved_ids.append(prod.id)
            else:
                return Response({'error': f'منتج غير موجود أو غير فعال: {pid}'}, status=status.HTTP_404_NOT_FOUND)

        # إذا تم إرسال منتج واحد فقط، جلب كل المنتجات التي لها نفس الاسم (مع اختلاف المتجر أو المواصفات)
        if len(resolved_ids) == 1:
            base_product = Product.objects.filter(id=resolved_ids[0], is_active=True).first()
            if not base_product:
                return Response({'error': 'المنتج غير موجود أو غير فعال'}, status=status.HTTP_404_NOT_FOUND)
            # جلب كل المنتجات بنفس الاسم (مع اختلاف المتجر)، مع تضمين المنتج الأساسي دائماً وبدون تكرار
            products_qs = Product.objects.filter(name=base_product.name, is_active=True).distinct()
            # تأكد أن المنتج الأساسي أول عنصر في القائمة، ولا يتكرر
            products = [base_product] + [p for p in products_qs if p.id != base_product.id]
            # إذا كان هناك تكرار للمنتج الأساسي (بسبب الاستعلام)، أزل التكرار
            seen_ids = set()
            unique_products = []
            for p in products:
                if p.id not in seen_ids:
                    unique_products.append(p)
                    seen_ids.add(p.id)
            products = unique_products
            if len(products) < 2:
                return Response({'error': 'لا يوجد منتجات مشابهة للمقارنة'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Validate products exist
            products = Product.objects.filter(id__in=resolved_ids, is_active=True)
            if products.count() != len(resolved_ids):
                return Response(
                    {'error': 'One or more products not found or inactive'},
                    status=status.HTTP_404_NOT_FOUND
                )
            products = list(products)

        # Generate AI comparison
        comparison_service = ComparisonService()
        comparison_result = comparison_service.compare_products(
            products=products,
            criteria=criteria,
            include_recommendation=include_ai_recommendation
        )

        # Save comparison
        comparison = ProductComparison.objects.create(
            user=request.user if request.user.is_authenticated else None,
            comparison_criteria=comparison_result['criteria'],
            ai_analysis=comparison_result['analysis']
        )
        comparison.products.set(products)

        # Serialize response
        response_serializer = ProductComparisonSerializer(comparison)

        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error comparing products: {str(e)}")
        return Response(
            {'error': 'Failed to compare products'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def compare_stores(request):
    """
    Compare multiple stores using AI analysis.
    """
    try:
        serializer = StoreComparisonRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        store_ids = serializer.validated_data['store_ids']
        comparison_type = serializer.validated_data['comparison_type']
        category_id = serializer.validated_data.get('category_id')
        
        # Validate stores exist
        stores = Store.objects.filter(id__in=store_ids, is_active=True)
        if stores.count() != len(store_ids):
            return Response(
                {'error': 'One or more stores not found or inactive'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate AI comparison
        comparison_service = ComparisonService()
        comparison_result = comparison_service.compare_stores(
            stores=list(stores),
            comparison_type=comparison_type,
            category_id=category_id
        )
        
        # Save comparison
        comparison = StoreComparison.objects.create(
            user=request.user if request.user.is_authenticated else None,
            comparison_type=comparison_type,
            ai_insights=comparison_result
        )
        comparison.stores.set(stores)
        
        # Serialize response
        response_serializer = StoreComparisonSerializer(comparison)
        
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error comparing stores: {str(e)}")
        return Response(
            {'error': 'Failed to compare stores'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_comparison_history(request):
    """
    Get user's comparison history (if authenticated).
    """
    if not request.user.is_authenticated:
        return Response(
            {'error': 'Authentication required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        # Get product comparisons
        product_comparisons = ProductComparison.objects.filter(
            user=request.user
        ).order_by('-created_at')[:10]
        
        # Get store comparisons
        store_comparisons = StoreComparison.objects.filter(
            user=request.user
        ).order_by('-created_at')[:10]
        
        response_data = {
            'product_comparisons': ProductComparisonSerializer(product_comparisons, many=True).data,
            'store_comparisons': StoreComparisonSerializer(store_comparisons, many=True).data
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error fetching comparison history: {str(e)}")
        return Response(
            {'error': 'Failed to fetch comparison history'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )




from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from products.models import Product  # Ensure Product model is imported
from products.serializers import ProductSerializer  # Ensure ProductSerializer is imported
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def compare_product_detail(request, pk):
    """
    Get details for all products with the same name as the product identified by 'pk'.
    Returns a list of products for comparison.
    """
    try:
        # First, find the base product using the provided pk
        base_product = Product.objects.filter(id=pk, is_active=True).first()

        if not base_product:
            return Response(
                {'error': 'المنتج الأساسي غير موجود أو غير فعال.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Now, find all active products that have the same name as the base product
        # This will include the base_product itself.
        products_with_same_name = Product.objects.filter(name=base_product.name, is_active=True).distinct()

        if not products_with_same_name.exists():
            # This case might be rare if base_product exists, but good for robustness
            return Response(
                {'error': f'لم يتم العثور على منتجات أخرى بنفس اسم "{base_product.name}".'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Serialize the queryset (which contains multiple products)
        # The serializer will convert each product object into a dictionary.
        return Response(ProductSerializer(products_with_same_name, many=True).data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching products with same name for comparison: {str(e)}")
        return Response(
            {'error': 'فشل في جلب المنتجات للمقارنة. الرجاء المحاولة لاحقاً.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )