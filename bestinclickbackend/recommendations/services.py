"""
Smart recommendation service integrating AI-powered recommendation engine.
"""

import logging
from typing import List, Dict, Optional
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from products.models import Product
from products.serializers import ProductSerializer
from ai_models.real_recommendation_engine import real_recommendation_engine
from ai_models.interaction_analyzer import InteractionAnalyzer
from .models import RecommendationSession, RecommendationResult

User = get_user_model()
logger = logging.getLogger(__name__)


class SmartRecommendationService:
    """
    Service for generating intelligent product recommendations.
    """
    
    def __init__(self):
        self.engine = real_recommendation_engine
        self.analyzer = InteractionAnalyzer()
    
    def get_personalized_recommendations(
        self,
        user: User = None,
        session_id: str = None,
        limit: int = 20,
        category_id: Optional[int] = None,
        request=None
    ) -> Dict:
        """
        Get personalized recommendations for user or session.
        """
        try:
            # Create recommendation session for tracking
            session = self._create_recommendation_session(
                user=user,
                session_id=session_id,
                recommendation_type='personalized'
            )
            
            if user and user.is_authenticated:
                # Get personalized recommendations for authenticated user
                recommendations = self.engine.get_personalized_recommendations(
                    user=user,
                    limit=limit,
                    category_id=category_id
                )
                
                if not recommendations:
                    # Fallback to general recommendations
                    recommendations = self.engine.get_general_recommendations(
                        limit=limit,
                        category_id=category_id
                    )
                    message = "عرض توصيات عامة - لم نجد توصيات مخصصة كافية."
                else:
                    message = "توصيات مخصصة بناءً على اهتماماتك وسلوكك."
                    
            else:
                # Anonymous user - use session-based or general recommendations
                if session_id:
                    recommendations = self._get_session_based_recommendations(
                        session_id=session_id,
                        limit=limit
                    )
                    message = "توصيات بناءً على جلستك الحالية."
                else:
                    recommendations = self.engine.get_general_recommendations(
                        limit=limit,
                        category_id=category_id
                    )
                    message = "توصيات عامة للمنتجات الشائعة."
            
            # Get product details and format response
            formatted_recommendations = self._format_recommendations(
                recommendations[:limit],
                session=session
            )
            
            return {
                'recommendations': formatted_recommendations,
                'message': message,
                'total_count': len(formatted_recommendations),
                'session_id': str(session.id) if session else None
            }
            
        except Exception as e:
            logger.error(f"Error getting personalized recommendations: {str(e)}")
            # Fallback to simple popular products
            try:
                fallback_recs = self.engine.get_general_recommendations(limit=limit)
                formatted_fallback = self._format_recommendations(fallback_recs)
                return {
                    'recommendations': formatted_fallback,
                    'message': "تم عرض توصيات عامة لحدوث خطأ في التوصيات الشخصية.",
                    'total_count': len(formatted_fallback),
                    'session_id': None
                }
            except Exception as e2:
                logger.error(f"Error in fallback recommendations: {str(e2)}")
                return {
                    'recommendations': [],
                    'message': "عذراً، حدث خطأ في جلب التوصيات.",
                    'total_count': 0,
                    'session_id': None
                }
    
    def get_similar_products(
        self,
        product_id: int,
        limit: int = 10,
        user: User = None
    ) -> Dict:
        """
        Get products similar to a specific product using real recommendation engine.
        """
        try:
            # Get base product info
            product = Product.objects.get(id=product_id, is_active=True)
            
            # Get similar products from real engine
            recommendations = self.engine.get_similar_products(
                product_id=product_id,
                limit=limit
            )
            
            # Format recommendations
            formatted_recs = self._format_recommendations(recommendations)
            
            return {
                'recommendations': formatted_recs,
                'message': f"منتجات مشابهة لـ {product.name}",
                'total_count': len(formatted_recs),
                'base_product': ProductSerializer(product).data
            }
            
        except Product.DoesNotExist:
            logger.warning(f"Product {product_id} not found for similar products")
            return {
                'recommendations': [],
                'message': "المنتج غير موجود",
                'total_count': 0,
                'base_product': None
            }
        except Exception as e:
            logger.error(f"Error getting similar products: {str(e)}")
            return {
                'recommendations': [],
                'message': "حدث خطأ في جلب المنتجات المشابهة",
                'total_count': 0,
                'base_product': None
            }
    
    def get_trending_products(self, limit: int = 20) -> Dict:
        """
        Get currently trending products using real recommendation engine.
        """
        try:
            # Get trending products from real engine
            recommendations = self.engine.get_trending_products(limit=limit)
            
            # Format recommendations
            formatted_recs = self._format_recommendations(recommendations)
            
            return {
                'recommendations': formatted_recs,
                'message': "المنتجات الرائجة حالياً",
                'total_count': len(formatted_recs)
            }
            
        except Exception as e:
            logger.error(f"Error getting trending products: {str(e)}")
            return {
                'recommendations': [],
                'message': "حدث خطأ في جلب المنتجات الرائجة",
                'total_count': 0
            }
    
    def log_user_interaction(
        self,
        behavior_type: str,
        product_id: int,
        user: User = None,
        session_id: str = None,
        request=None,
        **kwargs
    ) -> bool:
        """
        Log user interaction for recommendation learning.
        """
        try:
            # Extract additional data from request
            extra_data = {}
            if request:
                extra_data.update({
                    'ip_address': self._get_client_ip(request),
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'referrer_page': request.META.get('HTTP_REFERER', '')
                })
            
            # Add any additional kwargs
            extra_data.update(kwargs)
            
            # Log the behavior
            success = self.analyzer.log_user_behavior(
                user_id=user.id if user and user.is_authenticated else None,
                session_id=session_id,
                product_id=product_id,
                behavior_type=behavior_type,
                **extra_data
            )
            
            if success:
                logger.info(f"Logged {behavior_type} for product {product_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error logging user interaction: {str(e)}")
            return False
    
    def update_recommendation_performance(
        self,
        session_id: str,
        product_id: int,
        action: str
    ) -> bool:
        """
        Update recommendation performance tracking.
        """
        try:
            # Find the recommendation result
            result = RecommendationResult.objects.filter(
                session__id=session_id,
                product_id=product_id
            ).first()
            
            if not result:
                logger.warning(f"Recommendation result not found for session {session_id}, product {product_id}")
                return False
            
            # Update performance metrics
            if action == 'click':
                result.was_clicked = True
                result.click_timestamp = timezone.now()
            elif action == 'cart_add':
                result.was_added_to_cart = True
            elif action == 'purchase':
                result.was_purchased = True
            
            result.save()
            
            logger.info(f"Updated recommendation performance: {action} for product {product_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating recommendation performance: {str(e)}")
            return False
    
    def _create_recommendation_session(
        self,
        user: User = None,
        session_id: str = None,
        recommendation_type: str = 'general'
    ) -> RecommendationSession:
        """
        Create a recommendation session for tracking.
        """
        try:
            session = RecommendationSession.objects.create(
                user=user if user and user.is_authenticated else None,
                session_id=session_id,
                recommendation_type=recommendation_type
            )
            return session
        except Exception as e:
            logger.error(f"Error creating recommendation session: {str(e)}")
            return None
    
    def _get_session_based_recommendations(
        self,
        session_id: str,
        limit: int
    ) -> List[Dict]:
        """
        Get recommendations based on session behavior.
        """
        try:
            from recommendations.models import UserBehavior
            
            # Get session behaviors
            session_behaviors = UserBehavior.objects.filter(
                session_id=session_id,
                timestamp__gte=timezone.now() - timedelta(hours=24)
            ).select_related('product')
            
            if not session_behaviors.exists():
                return self._get_general_recommendations(limit)
            
            # Analyze session patterns
            viewed_categories = set()
            viewed_brands = set()
            price_ranges = []
            
            for behavior in session_behaviors:
                product = behavior.product
                if product.category:
                    viewed_categories.add(product.category.id)
                if hasattr(product, 'brand') and product.brand:
                    viewed_brands.add(product.brand.id)
                if product.price:
                    price_ranges.append(float(product.price))
            
            # Build recommendation query
            query = Q(is_active=True)
            
            if viewed_categories:
                query &= Q(category_id__in=viewed_categories)
            
            if viewed_brands:
                query &= Q(brand_id__in=viewed_brands)
            
            if price_ranges:
                avg_price = sum(price_ranges) / len(price_ranges)
                price_range = avg_price * 0.5  # ±50% of average
                query &= Q(
                    price__gte=max(0, avg_price - price_range),
                    price__lte=avg_price + price_range
                )
            
            # Exclude already viewed products
            viewed_products = session_behaviors.values_list('product_id', flat=True)
            query &= ~Q(id__in=viewed_products)
            
            # Get recommended products
            products = Product.objects.filter(query).select_related(
                'ai_interaction_score'
            ).order_by('-ai_interaction_score__overall_score')[:limit]
            
            recommendations = []
            for i, product in enumerate(products):
                recommendations.append({
                    'product_id': product.id,
                    'score': 0.7 - (i * 0.02),
                    'algorithm': 'session_based'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting session-based recommendations: {str(e)}")
            return self._get_general_recommendations(limit)
    
    def _get_general_recommendations(self, limit: int) -> List[Dict]:
        """
        Get general popular recommendations based on real data.
        """
        try:
            # Try to get products with AI interaction scores first
            products_with_scores = Product.objects.filter(
                is_active=True,
                ai_interaction_score__isnull=False
            ).select_related('ai_interaction_score').order_by(
                '-ai_interaction_score__overall_score'
            )[:limit]
            
            recommendations = []
            
            # If we have products with AI scores, use them
            if products_with_scores.exists():
                for i, product in enumerate(products_with_scores):
                    recommendations.append({
                        'product_id': product.id,
                        'score': product.ai_interaction_score.overall_score,
                        'algorithm': 'ai_popularity_based'
                    })
            
            # If we need more products or don't have AI scores, use fallback methods
            if len(recommendations) < limit:
                remaining_limit = limit - len(recommendations)
                existing_ids = [rec['product_id'] for rec in recommendations]
                
                # Get products by rating and review count
                popular_products = Product.objects.filter(
                    is_active=True,
                    average_rating__gt=0
                ).exclude(id__in=existing_ids).order_by(
                    '-average_rating', '-total_reviews', '-view_count'
                )[:remaining_limit]
                
                for i, product in enumerate(popular_products):
                    # Calculate score based on rating, reviews, and views
                    rating_score = product.average_rating / 5.0  # Normalize to 0-1
                    review_factor = min(product.total_reviews / 50.0, 1.0)  # Max factor at 50 reviews
                    view_factor = min(product.view_count / 1000.0, 1.0)  # Max factor at 1000 views
                    
                    score = (rating_score * 0.5 + review_factor * 0.3 + view_factor * 0.2)
                    
                    recommendations.append({
                        'product_id': product.id,
                        'score': score,
                        'algorithm': 'rating_based'
                    })
            
            # If still need more products, get newest products
            if len(recommendations) < limit:
                remaining_limit = limit - len(recommendations)
                existing_ids = [rec['product_id'] for rec in recommendations]
                
                newest_products = Product.objects.filter(
                    is_active=True
                ).exclude(id__in=existing_ids).order_by('-created_at')[:remaining_limit]
                
                for product in newest_products:
                    recommendations.append({
                        'product_id': product.id,
                        'score': 0.6,  # Default score for new products
                        'algorithm': 'newest_products'
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting general recommendations: {str(e)}")
            return []
    
    def _get_fallback_recommendations(self, limit: int) -> List[Dict]:
        """
        Simple fallback recommendations when everything else fails.
        """
        try:
            # Just get random active products
            products = Product.objects.filter(is_active=True).order_by('?')[:limit]
            
            recommendations = []
            for product in products:
                # Create basic product data
                product_data = {
                    'product_id': product.id,
                    'id': product.id,
                    'name': product.name,
                    'price': float(product.price) if product.price else 0.0,
                    'rating': 0,
                    'score': 0.8,
                    'algorithm': 'fallback_random',
                    'slug': getattr(product, 'slug', str(product.id))
                }
                
                # Add image if available
                if hasattr(product, 'image_urls') and product.image_urls:
                    product_data['image_urls'] = product.image_urls
                elif hasattr(product, 'image_url') and product.image_url:
                    product_data['image_url'] = product.image_url
                
                recommendations.append(product_data)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting fallback recommendations: {str(e)}")
            return []
    
    def _format_recommendations(
        self,
        recommendations: List[Dict],
        session: RecommendationSession = None
    ) -> List[Dict]:
        """
        Format recommendations with full product data.
        """
        try:
            if not recommendations:
                return []
            
            # Get product IDs
            product_ids = [rec['product_id'] for rec in recommendations]
            
            # Fetch products with related data
            products = Product.objects.filter(
                id__in=product_ids,
                is_active=True
            ).select_related('category', 'brand')
            
            # Create product lookup
            product_lookup = {p.id: p for p in products}
            
            # Format results
            formatted_results = []
            
            for i, rec in enumerate(recommendations):
                product_id = rec['product_id']
                
                if product_id not in product_lookup:
                    continue
                
                product = product_lookup[product_id]
                
                try:
                    # Serialize product data
                    product_data = ProductSerializer(product).data
                    
                    # Add recommendation metadata
                    product_data.update({
                        'score': rec.get('score', 0.5),
                        'algorithm': rec.get('algorithm', 'unknown'),
                        'position': i + 1
                    })
                    
                    formatted_results.append(product_data)
                except Exception as e:
                    logger.warning(f"Error serializing product {product.id}: {str(e)}")
                    # Fallback to basic product data
                    try:
                        basic_data = {
                            'id': product.id,
                            'name': product.name,
                            'slug': product.slug or f'product-{product.id}',
                            'price': str(product.price) if product.price else '0.00',
                            'image_urls': product.image_urls or [],
                            'average_rating': product.average_rating or 0.0,
                            'score': rec.get('score', 0.5),
                            'algorithm': rec.get('algorithm', 'unknown'),
                            'position': i + 1
                        }
                        formatted_results.append(basic_data)
                    except Exception as e2:
                        logger.error(f"Error creating basic data for product {product.id}: {str(e2)}")
                        continue
                
                # Save recommendation result for tracking
                if session:
                    try:
                        RecommendationResult.objects.create(
                            session=session,
                            product=product,
                            score=rec.get('score', 0.5),
                            position=i + 1,
                            algorithm_used=rec.get('algorithm', 'unknown')
                        )
                    except Exception as e:
                        logger.warning(f"Could not save recommendation result: {str(e)}")
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error formatting recommendations: {str(e)}")
            return []
    
    def _get_client_ip(self, request) -> str:
        """
        Get client IP address from request.
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or ''


# Global service instance
recommendation_service = SmartRecommendationService()