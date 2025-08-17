
"""
API views for store owner dashboard.
"""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Sum, F, Q
from django.utils import timezone
from datetime import timedelta
from products.models import Store, Product
from products.permissions import IsStoreOwner
from ai_models.models import UserBehaviorLog
from .models import StoreAnalytics, ProductPerformance
from .serializers import (
    StoreAnalyticsSerializer,
    ProductPerformanceSerializer,
    StoreProductSerializer
)
from products.serializers import StoreSerializer
import logging

logger = logging.getLogger(__name__)

# جلب بيانات المتجر الخاص بالمستخدم الحالي
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStoreOwner])
def my_store(request):
    """
    Endpoint to get the current user's store info.
    Returns store data if exists, or {"store": None} if not.
    """
    try:
        store = Store.objects.get(owner=request.user)
        return Response(StoreSerializer(store).data)
    except Store.DoesNotExist:
        return Response({"store": None})

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Sum, F
from django.utils import timezone
from datetime import timedelta
from products.models import Store, Product
from products.permissions import IsStoreOwner
from ai_models.models import UserBehaviorLog
from .models import StoreAnalytics, ProductPerformance
from .serializers import (
    StoreAnalyticsSerializer,
    ProductPerformanceSerializer,
    StoreProductSerializer
)
import logging

logger = logging.getLogger(__name__)


class StoreProductsView(generics.ListAPIView):
    """
    List products for a specific store (store owners only).
    """
    serializer_class = StoreProductSerializer
    permission_classes = [IsAuthenticated, IsStoreOwner]
    
    def get_queryset(self):
        store_id = self.kwargs['store_id']
        store = get_object_or_404(Store, id=store_id, owner=self.request.user)
        return Product.objects.filter(store=store).order_by('-created_at')


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStoreOwner])
def store_analytics(request, store_id):
    """
    Get analytics data for a store.
    """
    try:
        store = get_object_or_404(Store, id=store_id, owner=request.user)
        
        # Get date range from query params
        days = int(request.GET.get('days', 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get or create analytics data
        analytics_data = StoreAnalytics.objects.filter(
            store=store,
            date__range=[start_date, end_date]
        ).order_by('date')
        
        # If no data exists, generate sample data
        if not analytics_data.exists():
            analytics_data = _generate_sample_analytics(store, start_date, end_date)
        
        # Calculate summary metrics
        total_views = sum(a.total_views for a in analytics_data)
        total_revenue = sum(a.total_revenue for a in analytics_data)
        avg_conversion_rate = sum(a.conversion_rate for a in analytics_data) / len(analytics_data) if analytics_data else 0
        
        # Get top performing products
        top_products = Product.objects.filter(
            store=store,
            is_active=True
        ).order_by('-view_count', '-average_rating')[:5]
        
        response_data = {
            'store_info': {
                'id': store.id,
                'name': store.name,
                'average_rating': store.average_rating,
                'total_products': store.products.filter(is_active=True).count()
            },
            'summary_metrics': {
                'total_views': total_views,
                'total_revenue': float(total_revenue),
                'avg_conversion_rate': round(avg_conversion_rate, 2),
                'date_range': f"{start_date} to {end_date}"
            },
            'daily_analytics': StoreAnalyticsSerializer(analytics_data, many=True).data,
            'top_products': [
                {
                    'id': p.id,
                    'name': p.name,
                    'view_count': p.view_count,
                    'average_rating': p.average_rating,
                    'price': float(p.get_final_price())
                }
                for p in top_products
            ]
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting store analytics: {str(e)}")
        return Response(
            {'error': 'Failed to get analytics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStoreOwner])
def store_performance(request, store_id):
    """
    Get detailed performance metrics for a store.
    """
    import traceback
    try:
        store = get_object_or_404(Store, id=store_id, owner=request.user)

        # Get recent user behavior for this store's products
        recent_behavior = UserBehaviorLog.objects.filter(
            product__store=store,
            timestamp__gte=timezone.now() - timedelta(days=30)
        )

        # Calculate performance metrics
        total_views = recent_behavior.filter(action_type='view').count()
        total_clicks = recent_behavior.filter(action_type='click').count()
        total_cart_adds = recent_behavior.filter(action_type='add_to_cart').count()
        total_likes = recent_behavior.filter(action_type='like').count()

        # Calculate conversion rates
        click_through_rate = (total_clicks / total_views * 100) if total_views > 0 else 0
        cart_conversion_rate = (total_cart_adds / total_clicks * 100) if total_clicks > 0 else 0

        # Get product performance breakdown
        product_performance = recent_behavior.values(
            'product__id', 'product__name'
        ).annotate(
            views=Count('id', filter=Q(action_type='view')),
            clicks=Count('id', filter=Q(action_type='click')),
            cart_adds=Count('id', filter=Q(action_type='add_to_cart')),
            likes=Count('id', filter=Q(action_type='like'))
        ).order_by('-views')[:10]

        performance_data = {
            'overview': {
                'total_views': total_views,
                'total_clicks': total_clicks,
                'total_cart_adds': total_cart_adds,
                'total_likes': total_likes,
                'click_through_rate': round(click_through_rate, 2),
                'cart_conversion_rate': round(cart_conversion_rate, 2)
            },
            'product_performance': list(product_performance),
            'recommendations': _generate_performance_recommendations(
                click_through_rate, cart_conversion_rate, total_views
            )
        }

        return Response(performance_data, status=status.HTTP_200_OK)

    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"Error getting store performance: {str(e)}\nTraceback:\n{tb}")
        # Return the error and traceback for debugging (remove in production)
        return Response(
            {
                'error': 'Failed to get performance data',
                'details': str(e),
                'traceback': tb
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStoreOwner])
def toggle_product_stock(request, product_id):
    """
    Toggle product stock status (in stock / out of stock).
    """
    try:
        product = get_object_or_404(
            Product,
            id=product_id,
            store__owner=request.user
        )
        
        product.in_stock = not product.in_stock
        product.save(update_fields=['in_stock'])
        
        return Response({
            'message': f"Product {'marked as in stock' if product.in_stock else 'marked as out of stock'}",
            'in_stock': product.in_stock
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error toggling product stock: {str(e)}")
        return Response(
            {'error': 'Failed to update stock status'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStoreOwner])
def product_performance(request, product_id):
    """
    Get detailed performance metrics for a specific product.
    """
    try:
        product = get_object_or_404(
            Product,
            id=product_id,
            store__owner=request.user
        )
        
        # Get recent behavior for this product
        days = int(request.GET.get('days', 30))
        recent_behavior = UserBehaviorLog.objects.filter(
            product=product,
            timestamp__gte=timezone.now() - timedelta(days=days)
        )
        
        # Calculate metrics
        views = recent_behavior.filter(action_type='view').count()
        clicks = recent_behavior.filter(action_type='click').count()
        cart_adds = recent_behavior.filter(action_type='add_to_cart').count()
        likes = recent_behavior.filter(action_type='like').count()
        
        # Daily breakdown
        daily_metrics = recent_behavior.extra(
            select={'day': 'date(timestamp)'}
        ).values('day').annotate(
            views=Count('id', filter=Q(action_type='view')),
            clicks=Count('id', filter=Q(action_type='click')),
            cart_adds=Count('id', filter=Q(action_type='add_to_cart'))
        ).order_by('day')
        
        performance_data = {
            'product_info': {
                'id': product.id,
                'name': product.name,
                'price': float(product.get_final_price()),
                'average_rating': product.average_rating,
                'total_reviews': product.total_reviews
            },
            'metrics': {
                'total_views': views,
                'total_clicks': clicks,
                'total_cart_adds': cart_adds,
                'total_likes': likes,
                'click_through_rate': (clicks / views * 100) if views > 0 else 0,
                'cart_conversion_rate': (cart_adds / clicks * 100) if clicks > 0 else 0
            },
            'daily_breakdown': list(daily_metrics),
            'ai_insights': _generate_product_insights(product, views, clicks, cart_adds)
        }
        
        return Response(performance_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting product performance: {str(e)}")
        return Response(
            {'error': 'Failed to get product performance'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStoreOwner])
def store_ai_insights(request, store_id):
    """
    Get AI-generated insights and recommendations for store improvement.
    """
    try:
        store = get_object_or_404(Store, id=store_id, owner=request.user)
        
        # Get analysis period from query params (default 30 days)
        days = int(request.GET.get('days', 30))
        
        # Generate comprehensive AI insights using simplified analysis
        insights = _generate_comprehensive_insights(store, days)
        
        return Response(insights, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error generating AI insights: {str(e)}")
        return Response(
            {'error': 'Failed to generate insights', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _generate_comprehensive_insights(store, days=30):
    """
    Generate comprehensive AI insights for store improvement
    """
    try:
        # Collect store data
        products = store.products.filter(is_active=True)
        total_products = products.count()
        
        if total_products == 0:
            return {
                'store_id': store.id,
                'store_name': store.name,
                'analysis_period': f'{days} days',
                'generated_at': timezone.now().isoformat(),
                'insights': [{
                    'type': 'setup',
                    'priority': 'high',
                    'title': 'Start Adding Products',
                    'description': 'Your store is empty! You need to add products to start selling and attract customers.',
                    'action': 'Add New Product',
                    'impact': 'Begin your e-commerce journey',
                    'icon': 'fa-plus'
                }],
                'performance_score': 10,
                'performance_summary': 'Your store needs initial setup. Start by adding products!',
                'total_insights': 1
            }
        
        insights = []
        score = 50  # Base score
        
        # Product Analysis
        out_of_stock = products.filter(in_stock=False).count()
        no_image_products = products.filter(image_urls__isnull=True).count() + products.filter(image_urls__exact='[]').count()
        low_view_products = products.filter(view_count__lt=10).count()
        high_rated_products = products.filter(average_rating__gte=4.5).count()
        avg_rating = products.aggregate(avg_rating=Avg('average_rating'))['avg_rating'] or 0
        total_views = sum(p.view_count or 0 for p in products)
        total_reviews = sum(p.total_reviews or 0 for p in products)
        
        # 1. Inventory Management Insights
        if out_of_stock > 0:
            out_of_stock_rate = (out_of_stock / total_products) * 100
            if out_of_stock_rate > 20:
                insights.append({
                    'type': 'inventory',
                    'priority': 'high',
                    'title': 'Critical Inventory Issue',
                    'description': f'{out_of_stock_rate:.0f}% of your products are out of stock ({out_of_stock} products). This is causing you to lose potential sales.',
                    'action': 'Restock Immediately',
                    'impact': 'Prevent losing 30-50% of potential sales',
                    'icon': 'fa-boxes'
                })
                score -= 20
            elif out_of_stock_rate > 10:
                insights.append({
                    'type': 'inventory',
                    'priority': 'medium',
                    'title': 'Low Stock Warning',
                    'description': f'{out_of_stock} products are out of stock. Monitor inventory levels regularly.',
                    'action': 'Set Up Stock Alerts',
                    'impact': 'Avoid sudden stockouts',
                    'icon': 'fa-exclamation-triangle'
                })
                score -= 10
        else:
            insights.append({
                'type': 'inventory',
                'priority': 'low',
                'title': 'Excellent Inventory Management',
                'description': 'All your products are in stock! Keep up this great performance.',
                'action': 'Maintain Continuous Monitoring',
                'impact': 'Customer satisfaction and continuous sales',
                'icon': 'fa-check-circle'
            })
            score += 15
        
        # 2. Product Images Insights
        if no_image_products > 0:
            no_image_rate = (no_image_products / total_products) * 100
            insights.append({
                'type': 'product_images',
                'priority': 'high',
                'title': 'Products Missing Images',
                'description': f'{no_image_products} products ({no_image_rate:.0f}%) have no images. Products with images get 5x more views!',
                'action': 'Add High-Quality Images',
                'impact': 'Increase views by 400%',
                'icon': 'fa-image'
            })
            score -= 15
        
        # 3. Product Performance Insights
        if low_view_products > 0:
            low_view_rate = (low_view_products / total_products) * 100
            if low_view_rate > 50:
                insights.append({
                    'type': 'product_performance',
                    'priority': 'high',
                    'title': 'Low-Performing Products',
                    'description': f'{low_view_rate:.0f}% of your products have low views. You need to improve titles and descriptions.',
                    'action': 'Optimize Product Descriptions & Keywords',
                    'impact': 'Increase search visibility by 60%',
                    'icon': 'fa-eye'
                })
                score -= 15
            elif low_view_rate > 25:
                insights.append({
                    'type': 'product_performance',
                    'priority': 'medium',
                    'title': 'Visibility Improvement Opportunity',
                    'description': f'{low_view_products} products need better visibility. Consider improving titles.',
                    'action': 'Review Product Titles',
                    'impact': 'Increase views by 30%',
                    'icon': 'fa-search'
                })
                score -= 8
        
        # 4. Customer Satisfaction Insights
        if total_reviews > 0:
            review_rate = (total_reviews / max(total_views, 1)) * 100
            if avg_rating >= 4.5:
                insights.append({
                    'type': 'customer_satisfaction',
                    'priority': 'low',
                    'title': 'Extremely Happy Customers!',
                    'description': f'Your excellent rating of {avg_rating:.1f}/5 shows customer satisfaction. Use this in marketing!',
                    'action': 'Feature Reviews in Advertisements',
                    'impact': 'Increase trust and sales by 25%',
                    'icon': 'fa-star'
                })
                score += 20
            elif avg_rating >= 4.0:
                insights.append({
                    'type': 'customer_satisfaction',
                    'priority': 'low',
                    'title': 'Good Customer Reviews',
                    'description': f'Your rating of {avg_rating:.1f}/5 is good. It can be improved by focusing on quality details.',
                    'action': 'Improve Product Quality & Service',
                    'impact': 'Reach 4.5+ star rating',
                    'icon': 'fa-thumbs-up'
                })
                score += 10
            elif avg_rating < 3.5:
                insights.append({
                    'type': 'customer_satisfaction',
                    'priority': 'high',
                    'title': 'Customer Satisfaction Needs Improvement',
                    'description': f'Your rating of {avg_rating:.1f}/5 is low. You must review product quality and service immediately.',
                    'action': 'Comprehensive Quality & Service Review',
                    'impact': 'Improve reputation and increase sales',
                    'icon': 'fa-exclamation-triangle'
                })
                score -= 25
            
            if review_rate < 2:
                insights.append({
                    'type': 'customer_engagement',
                    'priority': 'medium',
                    'title': 'Low Customer Engagement',
                    'description': f'Review rate is only {review_rate:.1f}%. Encourage customers to leave reviews.',
                    'action': 'Create Review Encouragement Campaign',
                    'impact': 'Increase trust and credibility',
                    'icon': 'fa-comments'
                })
        else:
            insights.append({
                'type': 'customer_engagement',
                'priority': 'medium',
                'title': 'No Reviews Yet',
                'description': 'Your store needs customer reviews to build trust. Encourage your first customers to review.',
                'action': 'Request Reviews from Early Customers',
                'impact': 'Build trust for new customers',
                'icon': 'fa-star-half-alt'
            })
        
        # 5. High-performing products opportunity
        if high_rated_products > 0:
            insights.append({
                'type': 'marketing_opportunity',
                'priority': 'medium',
                'title': 'Star Products for Promotion',
                'description': f'You have {high_rated_products} products with excellent ratings (4.5+ stars). Promote them more!',
                'action': 'Create Promotional Campaign for Top Products',
                'impact': 'Increase sales by 40%',
                'icon': 'fa-rocket'
            })
            score += 10
        
        # 6. Pricing Strategy Insights
        discounted_products = products.filter(discount_percentage__gt=0).count()
        if total_products > 0:
            discount_rate = (discounted_products / total_products) * 100
            if discount_rate < 10:
                insights.append({
                    'type': 'pricing_strategy',
                    'priority': 'medium',
                    'title': 'Opportunity for Attractive Offers',
                    'description': 'Few of your products have discounts. Offers increase attractiveness and encourage purchases.',
                    'action': 'Create Seasonal Offers or Limited Discounts',
                    'impact': 'Increase conversion rate by 35%',
                    'icon': 'fa-percent'
                })
            elif discount_rate > 60:
                insights.append({
                    'type': 'pricing_strategy',
                    'priority': 'medium',
                    'title': 'Review Discount Strategy',
                    'description': f'{discount_rate:.0f}% of your products have discounts. Ensure you maintain profitability.',
                    'action': 'Review Profit Margins and Pricing',
                    'impact': 'Improve profitability while maintaining sales',
                    'icon': 'fa-chart-line'
                })
        
        # 7. SEO and Marketing Insights
        products_without_description = products.filter(
            Q(description__isnull=True) | Q(description__exact='') | Q(description__icontains='description')
        ).count()
        
        if products_without_description > 0:
            insights.append({
                'type': 'seo_marketing',
                'priority': 'medium',
                'title': 'Search Engine Optimization (SEO)',
                'description': f'{products_without_description} products lack detailed descriptions. Good descriptions improve your search visibility.',
                'action': 'Write Detailed and Attractive Descriptions',
                'impact': 'Increase traffic from search engines',
                'icon': 'fa-search'
            })
        
        # 8. Store Verification Insight
        if not store.is_verified:
            insights.append({
                'type': 'store_credibility',
                'priority': 'high',
                'title': 'Store Verification Required',
                'description': 'Your store is not verified. Verified stores gain more customer trust.',
                'action': 'Complete Store Verification Process',
                'impact': 'Increase trust and sales by 50%',
                'icon': 'fa-shield-alt'
            })
            score -= 15
        
        # 9. Social Media Marketing Opportunity
        if total_views > 100:
            insights.append({
                'type': 'social_media',
                'priority': 'low',
                'title': 'Social Media Marketing Opportunity',
                'description': f'Your products get {total_views} views. Share them on social media to double your reach!',
                'action': 'Share Products on Facebook and Instagram',
                'impact': 'Double potential visitor count',
                'icon': 'fa-share-alt'
            })
        
        # Calculate final performance score
        performance_score = min(100, max(0, score))
        
        # Generate performance summary
        high_priority_count = len([i for i in insights if i.get('priority') == 'high'])
        if performance_score >= 80:
            performance_summary = f"Excellent performance! Your store operates with high efficiency. You have {high_priority_count} points that need attention."
        elif performance_score >= 60:
            performance_summary = f"Good performance with room for improvement. Focus on {high_priority_count} important points to enhance performance."
        elif performance_score >= 40:
            performance_summary = f"Average performance. Your store needs improvements in {high_priority_count} important areas."
        else:
            performance_summary = f"Your store needs fundamental improvements. Start with {high_priority_count} high-priority points."
        
        return {
            'store_id': store.id,
            'store_name': store.name,
            'analysis_period': f'{days} days',
            'generated_at': timezone.now().isoformat(),
            'insights': insights,
            'performance_score': round(performance_score, 1),
            'performance_summary': performance_summary,
            'total_insights': len(insights),
            'priority_insights': [i for i in insights if i.get('priority') == 'high']
        }
        
    except Exception as e:
        logger.error(f"Error generating comprehensive insights: {str(e)}")
        return {
            'error': 'Failed to generate insights',
            'insights': [],
            'performance_score': 0,
            'performance_summary': 'Unable to analyze store performance at this time.'
        }


def _generate_sample_analytics(store, start_date, end_date):
    """
    Generate sample analytics data for demonstration.
    """
    import random
    from datetime import date, timedelta
    
    analytics_data = []
    current_date = start_date
    
    while current_date <= end_date:
        analytics = StoreAnalytics.objects.create(
            store=store,
            date=current_date,
            total_views=random.randint(50, 200),
            unique_visitors=random.randint(30, 150),
            product_views=random.randint(40, 180),
            total_clicks=random.randint(20, 100),
            add_to_cart_count=random.randint(5, 30),
            conversion_rate=random.uniform(2.0, 8.0),
            total_orders=random.randint(1, 10),
            total_revenue=random.uniform(100, 1000),
            average_order_value=random.uniform(50, 200)
        )
        analytics_data.append(analytics)
        current_date += timedelta(days=1)
    
    return analytics_data


def _generate_performance_recommendations(ctr, conversion_rate, total_views):
    """
    Generate AI recommendations based on performance metrics.
    """
    recommendations = []
    
    if ctr < 5:
        recommendations.append({
            'type': 'improvement',
            'title': 'Improve Click-Through Rate',
            'description': 'Your CTR is below average. Consider improving product images and descriptions.',
            'priority': 'high'
        })
    
    if conversion_rate < 3:
        recommendations.append({
            'type': 'improvement',
            'title': 'Optimize Conversion Rate',
            'description': 'Low conversion rate detected. Review pricing and product positioning.',
            'priority': 'high'
        })
    
    if total_views < 100:
        recommendations.append({
            'type': 'growth',
            'title': 'Increase Visibility',
            'description': 'Low traffic detected. Consider promotional campaigns or SEO optimization.',
            'priority': 'medium'
        })
    
    return recommendations


def _generate_product_insights(product, views, clicks, cart_adds):
    """
    Generate AI insights for a specific product.
    """
    insights = []
    
    if views > 100 and clicks < 10:
        insights.append("High views but low clicks suggest the product title or main image needs improvement.")
    
    if clicks > 20 and cart_adds < 3:
        insights.append("Good click-through but low cart additions. Consider reviewing price or product details.")
    
    if product.average_rating < 3.5:
        insights.append("Low ratings are affecting performance. Focus on improving product quality or customer service.")
    
    if not insights:
        insights.append("Product performance is within normal ranges. Continue monitoring trends.")
    
    return insights


def _calculate_store_health_score(store, avg_rating, total_interactions):
    """
    Calculate an overall health score for the store.
    """
    rating_score = (avg_rating / 5) * 40  # 40% weight
    interaction_score = min(total_interactions / 100, 1) * 30  # 30% weight
    product_count_score = min(store.products.filter(is_active=True).count() / 20, 1) * 30  # 30% weight
    
    health_score = rating_score + interaction_score + product_count_score
    return round(health_score, 1)


def _generate_store_recommendations(store, products, recent_behavior):
    """
    Generate AI recommendations for store improvement.
    """
    recommendations = []
    
    # Product diversity recommendation
    if products.count() < 10:
        recommendations.append({
            'category': 'inventory',
            'title': 'Expand Product Range',
            'description': 'Consider adding more products to increase customer choice and engagement.',
            'impact': 'medium'
        })
    
    # Rating improvement
    avg_rating = products.aggregate(avg=Avg('average_rating'))['avg'] or 0
    if avg_rating < 4.0:
        recommendations.append({
            'category': 'quality',
            'title': 'Improve Product Quality',
            'description': 'Focus on products with lower ratings to improve overall store reputation.',
            'impact': 'high'
        })
    
    # Engagement recommendation
    if recent_behavior.count() < 50:
        recommendations.append({
            'category': 'marketing',
            'title': 'Increase Marketing Efforts',
            'description': 'Low customer engagement detected. Consider promotional campaigns.',
            'impact': 'high'
        })
    
    return recommendations


def _get_trending_categories_for_store(store):
    """
    Get trending categories based on store's product performance.
    """
    from django.db.models import Count
    
    trending = UserBehaviorLog.objects.filter(
        product__store=store,
        timestamp__gte=timezone.now() - timedelta(days=7)
    ).values(
        'product__category__name'
    ).annotate(
        interaction_count=Count('id')
    ).order_by('-interaction_count')[:3]
    
    return [item['product__category__name'] for item in trending if item['product__category__name']]


def _get_optimization_tips(store, avg_rating, total_interactions):
    """
    Get optimization tips based on store performance.
    """
    tips = []
    
    if avg_rating < 4.0:
        tips.append("Focus on improving product descriptions and customer service to boost ratings.")
    
    if total_interactions < 100:
        tips.append("Optimize product titles and images to increase customer engagement.")
    
    tips.append("Regularly update inventory and respond promptly to customer inquiries.")
    tips.append("Consider seasonal promotions to drive sales during peak periods.")
    
    return tips
