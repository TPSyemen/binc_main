"""
Real recommendation engine that works with actual database data.
No mock data - only real user behavior and product data.
"""

import logging
from typing import List, Dict, Optional, Set
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Avg, F
from django.utils import timezone
from datetime import timedelta

from products.models import Product, ProductLike, ProductReview, Category
from recommendations.models import UserBehavior

User = get_user_model()
logger = logging.getLogger(__name__)


class RealRecommendationEngine:
    """
    Recommendation engine that works with real database data only.
    """
    
    def __init__(self):
        self.behavior_weights = {
            'view': 1.0,
            'like': 5.0,
            'unlike': -3.0,
            'cart_add': 4.0,
            'cart_remove': -1.0,
            'purchase': 10.0,
            'review_positive': 6.0,
            'review_negative': -4.0,
            'wishlist_add': 3.0,
            'wishlist_remove': -1.0,
            'share': 2.0,
            'compare': 1.5,
            'search': 0.5
        }
    
    def get_personalized_recommendations(
        self,
        user: User,
        limit: int = 20,
        category_id: Optional[int] = None,
        exclude_ids: List[int] = None
    ) -> List[Dict]:
        """
        Get personalized recommendations based on real user data.
        """
        try:
            if not user or not user.is_authenticated:
                return self.get_general_recommendations(limit=limit, category_id=category_id, exclude_ids=exclude_ids)
            
            exclude_ids = exclude_ids or []
            recommendations = []
            
            # 1. Get recommendations based on user's liked products
            liked_recs = self._get_recommendations_from_likes(user, limit // 4, exclude_ids)
            recommendations.extend(liked_recs)
            exclude_ids.extend([rec['product_id'] for rec in liked_recs])
            
            # 2. Get recommendations based on user's reviews
            review_recs = self._get_recommendations_from_reviews(user, limit // 4, exclude_ids)
            recommendations.extend(review_recs)
            exclude_ids.extend([rec['product_id'] for rec in review_recs])
            
            # 3. Get recommendations based on user behavior
            behavior_recs = self._get_recommendations_from_behavior(user, limit // 4, exclude_ids)
            recommendations.extend(behavior_recs)
            exclude_ids.extend([rec['product_id'] for rec in behavior_recs])
            
            # 4. Fill remaining with category-based recommendations
            if len(recommendations) < limit:
                remaining = limit - len(recommendations)
                category_recs = self._get_category_based_recommendations(
                    user, remaining, exclude_ids, category_id
                )
                recommendations.extend(category_recs)
            
            # Sort by score and remove duplicates
            unique_recommendations = self._deduplicate_and_sort(recommendations, limit)
            
            # Fill with general recommendations if needed
            if len(unique_recommendations) < limit:
                remaining = limit - len(unique_recommendations)
                existing_ids = [rec['product_id'] for rec in unique_recommendations]
                general_recs = self.get_general_recommendations(
                    limit=remaining,
                    category_id=category_id,
                    exclude_ids=existing_ids
                )
                unique_recommendations.extend(general_recs)
            
            return unique_recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error generating personalized recommendations: {str(e)}")
            return self.get_general_recommendations(limit=limit, category_id=category_id, exclude_ids=exclude_ids)
    
    def get_general_recommendations(
        self,
        limit: int = 20,
        category_id: Optional[int] = None,
        exclude_ids: List[int] = None
    ) -> List[Dict]:
        """
        Get general recommendations based on product popularity and ratings.
        """
        try:
            exclude_ids = exclude_ids or []
            query = Q(is_active=True)
            
            if category_id:
                query &= Q(category_id=category_id)
            
            if exclude_ids:
                query &= ~Q(id__in=exclude_ids)
            
            recommendations = []
            
            # 1. Try to get products with AI interaction scores first
            try:
                ai_scored_products = Product.objects.filter(
                    query,
                    ai_interaction_score__isnull=False
                ).select_related('ai_interaction_score').order_by(
                    '-ai_interaction_score__overall_score'
                )[:limit//2]
                
                for product in ai_scored_products:
                    recommendations.append({
                        'product_id': product.id,
                        'score': product.ai_interaction_score.overall_score,
                        'algorithm': 'ai_scored'
                    })
            except Exception as e:
                logger.warning(f"Could not get AI scored products: {str(e)}")
            
            # 2. Get highly rated products with reviews
            if len(recommendations) < limit:
                remaining = limit - len(recommendations)
                existing_ids = [rec['product_id'] for rec in recommendations]
                
                highly_rated = Product.objects.filter(
                    query,
                    average_rating__gte=3.0  # Lower threshold for more results
                ).exclude(id__in=existing_ids).order_by('-average_rating', '-total_reviews')[:remaining//2]
                
                for product in highly_rated:
                    score = (product.average_rating / 5.0) * 0.7 + min(product.total_reviews / 10.0, 1.0) * 0.3
                    recommendations.append({
                        'product_id': product.id,
                        'score': score,
                        'algorithm': 'highly_rated'
                    })
            
            # 3. Get most viewed products
            if len(recommendations) < limit:
                remaining = limit - len(recommendations)
                existing_ids = [rec['product_id'] for rec in recommendations]
                
                most_viewed = Product.objects.filter(query).exclude(
                    id__in=existing_ids
                ).order_by('-view_count')[:remaining//2]
                
                for product in most_viewed:
                    score = min(product.view_count / 100.0, 1.0) * 0.6 + 0.3  # Lower threshold
                    recommendations.append({
                        'product_id': product.id,
                        'score': score,
                        'algorithm': 'most_viewed'
                    })
            
            # 4. Get any remaining products if still need more
            if len(recommendations) < limit:
                remaining = limit - len(recommendations)
                existing_ids = [rec['product_id'] for rec in recommendations]
                
                any_products = Product.objects.filter(query).exclude(
                    id__in=existing_ids
                ).order_by('-created_at')[:remaining]
                
                for product in any_products:
                    recommendations.append({
                        'product_id': product.id,
                        'score': 0.4,
                        'algorithm': 'fallback'
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting general recommendations: {str(e)}")
            # Last resort fallback
            try:
                fallback_products = Product.objects.filter(is_active=True)[:limit]
                return [{
                    'product_id': product.id,
                    'score': 0.3,
                    'algorithm': 'emergency_fallback'
                } for product in fallback_products]
            except:
                return []
    
    def _get_recommendations_from_likes(
        self,
        user: User,
        limit: int,
        exclude_ids: List[int]
    ) -> List[Dict]:
        """
        Get recommendations based on user's liked products.
        """
        try:
            # Get user's liked products
            liked_products = ProductLike.objects.filter(user=user).select_related('product')
            
            if not liked_products.exists():
                return []
            
            # Get categories and brands from liked products
            liked_categories = set()
            liked_brands = set()
            
            for like in liked_products:
                if like.product.category:
                    liked_categories.add(like.product.category.id)
                if hasattr(like.product, 'brand') and like.product.brand:
                    liked_brands.add(like.product.brand.id)
            
            # Find similar products
            query = Q(is_active=True)
            
            if liked_categories:
                query &= Q(category_id__in=liked_categories)
            
            if liked_brands:
                query &= Q(brand_id__in=liked_brands)
            
            # Exclude already liked products and other exclusions
            liked_product_ids = [like.product.id for like in liked_products]
            all_exclude_ids = exclude_ids + liked_product_ids
            query &= ~Q(id__in=all_exclude_ids)
            
            similar_products = Product.objects.filter(query).order_by(
                '-average_rating', '-total_reviews'
            )[:limit]
            
            recommendations = []
            for product in similar_products:
                # Higher score for products in same categories/brands as liked products
                score = 0.8
                if product.category_id in liked_categories:
                    score += 0.1
                if hasattr(product, 'brand') and product.brand and product.brand.id in liked_brands:
                    score += 0.1
                
                recommendations.append({
                    'product_id': product.id,
                    'score': min(score, 1.0),
                    'algorithm': 'based_on_likes'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting recommendations from likes: {str(e)}")
            return []
    
    def _get_recommendations_from_reviews(
        self,
        user: User,
        limit: int,
        exclude_ids: List[int]
    ) -> List[Dict]:
        """
        Get recommendations based on user's review history.
        """
        try:
            # Get user's reviews
            user_reviews = ProductReview.objects.filter(user=user).select_related('product')
            
            if not user_reviews.exists():
                return []
            
            # Analyze user's review patterns
            high_rated_products = user_reviews.filter(rating__gte=4)
            
            if not high_rated_products.exists():
                return []
            
            # Get categories from highly rated products
            preferred_categories = set()
            for review in high_rated_products:
                if review.product.category:
                    preferred_categories.add(review.product.category.id)
            
            # Find products in preferred categories
            query = Q(
                is_active=True,
                average_rating__gte=4.0
            )
            
            if preferred_categories:
                query &= Q(category_id__in=preferred_categories)
            
            # Exclude already reviewed products
            reviewed_product_ids = [review.product.id for review in user_reviews]
            all_exclude_ids = exclude_ids + reviewed_product_ids
            query &= ~Q(id__in=all_exclude_ids)
            
            recommended_products = Product.objects.filter(query).order_by(
                '-average_rating', '-total_reviews'
            )[:limit]
            
            recommendations = []
            for product in recommended_products:
                score = 0.75 + (product.average_rating / 5.0) * 0.25
                recommendations.append({
                    'product_id': product.id,
                    'score': score,
                    'algorithm': 'based_on_reviews'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting recommendations from reviews: {str(e)}")
            return []
    
    def _get_recommendations_from_behavior(
        self,
        user: User,
        limit: int,
        exclude_ids: List[int]
    ) -> List[Dict]:
        """
        Get recommendations based on user behavior patterns.
        """
        try:
            # Get recent user behaviors
            recent_behaviors = UserBehavior.objects.filter(
                user=user,
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).select_related('product')
            
            if not recent_behaviors.exists():
                return []
            
            # Analyze behavior patterns
            viewed_categories = set()
            positive_interactions = []
            
            for behavior in recent_behaviors:
                if behavior.product.category:
                    viewed_categories.add(behavior.product.category.id)
                
                # Track positive interactions
                if behavior.behavior_type in ['like', 'cart_add', 'purchase', 'wishlist_add']:
                    positive_interactions.append(behavior.product.id)
            
            # Find products in viewed categories
            query = Q(is_active=True)
            
            if viewed_categories:
                query &= Q(category_id__in=viewed_categories)
            
            # Exclude products user already interacted with
            interacted_products = [b.product.id for b in recent_behaviors]
            all_exclude_ids = exclude_ids + interacted_products
            query &= ~Q(id__in=all_exclude_ids)
            
            recommended_products = Product.objects.filter(query).order_by(
                '-average_rating', '-view_count'
            )[:limit]
            
            recommendations = []
            for product in recommended_products:
                score = 0.7
                # Boost score if in frequently viewed categories
                if product.category_id in viewed_categories:
                    score += 0.1
                
                recommendations.append({
                    'product_id': product.id,
                    'score': score,
                    'algorithm': 'based_on_behavior'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting recommendations from behavior: {str(e)}")
            return []
    
    def _get_category_based_recommendations(
        self,
        user: User,
        limit: int,
        exclude_ids: List[int],
        category_id: Optional[int] = None
    ) -> List[Dict]:
        """
        Get recommendations based on category preferences.
        """
        try:
            query = Q(is_active=True)
            
            if category_id:
                query &= Q(category_id=category_id)
            
            if exclude_ids:
                query &= ~Q(id__in=exclude_ids)
            
            # Get popular products in category
            products = Product.objects.filter(query).order_by(
                '-average_rating', '-total_reviews', '-view_count'
            )[:limit]
            
            recommendations = []
            for product in products:
                score = 0.6
                if product.average_rating > 0:
                    score += (product.average_rating / 5.0) * 0.2
                
                recommendations.append({
                    'product_id': product.id,
                    'score': score,
                    'algorithm': 'category_based'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting category-based recommendations: {str(e)}")
            return []
    
    def _deduplicate_and_sort(self, recommendations: List[Dict], limit: int) -> List[Dict]:
        """
        Remove duplicates and sort recommendations by score.
        """
        seen_products = set()
        unique_recommendations = []
        
        for rec in sorted(recommendations, key=lambda x: x['score'], reverse=True):
            if rec['product_id'] not in seen_products:
                seen_products.add(rec['product_id'])
                unique_recommendations.append(rec)
                
                if len(unique_recommendations) >= limit:
                    break
        
        return unique_recommendations
    
    def get_similar_products(
        self,
        product_id: int,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get products similar to a specific product based on real data.
        """
        try:
            # Get the base product
            try:
                base_product = Product.objects.get(id=product_id, is_active=True)
            except Product.DoesNotExist:
                return []
            
            # Build similarity query
            query = Q(is_active=True) & ~Q(id=product_id)
            
            # Same category
            if base_product.category:
                query &= Q(category=base_product.category)
            
            # Similar price range (±30%)
            if base_product.price:
                price_min = base_product.price * 0.7
                price_max = base_product.price * 1.3
                query &= Q(price__gte=price_min, price__lte=price_max)
            
            # Get similar products
            similar_products = Product.objects.filter(query).order_by(
                '-average_rating', '-total_reviews'
            )[:limit]
            
            recommendations = []
            for i, product in enumerate(similar_products):
                # Calculate similarity score
                score = 0.8 - (i * 0.05)  # Decreasing score by position
                
                # Boost score for same brand
                if (hasattr(base_product, 'brand') and hasattr(product, 'brand') and 
                    base_product.brand and product.brand and 
                    base_product.brand.id == product.brand.id):
                    score += 0.1
                
                recommendations.append({
                    'product_id': product.id,
                    'score': max(0.1, score),
                    'algorithm': 'content_similarity'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting similar products: {str(e)}")
            return []
    
    def get_trending_products(self, limit: int = 20) -> List[Dict]:
        """
        Get trending products based on recent activity.
        """
        try:
            # Get products with recent positive interactions
            recent_date = timezone.now() - timedelta(days=7)
            
            trending_products = Product.objects.filter(
                is_active=True,
                userbehavior__timestamp__gte=recent_date,
                userbehavior__behavior_type__in=['view', 'like', 'cart_add', 'purchase']
            ).annotate(
                recent_interactions=Count('userbehavior')
            ).order_by('-recent_interactions', '-average_rating')[:limit]
            
            recommendations = []
            for i, product in enumerate(trending_products):
                # Score based on recent interactions and rating
                interaction_score = min(product.recent_interactions / 50.0, 1.0)
                rating_score = product.average_rating / 5.0 if product.average_rating > 0 else 0.5
                
                score = interaction_score * 0.7 + rating_score * 0.3
                
                recommendations.append({
                    'product_id': product.id,
                    'score': score,
                    'algorithm': 'trending_analysis'
                })
            
            # If not enough trending products, fill with highly rated recent products
            if len(recommendations) < limit:
                remaining = limit - len(recommendations)
                existing_ids = [rec['product_id'] for rec in recommendations]
                
                recent_products = Product.objects.filter(
                    is_active=True,
                    created_at__gte=timezone.now() - timedelta(days=30)
                ).exclude(id__in=existing_ids).order_by('-average_rating')[:remaining]
                
                for product in recent_products:
                    recommendations.append({
                        'product_id': product.id,
                        'score': 0.6,
                        'algorithm': 'recent_products'
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting trending products: {str(e)}")
            return []


# Global instance
real_recommendation_engine = RealRecommendationEngine()