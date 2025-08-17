"""
Interaction analyzer for updating product scores based on user behavior.
"""

import numpy as np
from django.db.models import Count, Avg, Sum, F, Q
from django.utils import timezone
from datetime import timedelta
from typing import Dict, List
import logging

from recommendations.models import UserBehavior, ProductInteractionScore, UserSimilarity
from products.models import Product
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


class InteractionAnalyzer:
    """
    Analyzes user interactions and updates product scores.
    """
    
    def __init__(self):
        self.behavior_weights = {
            'view': 1.0,
            'like': 3.0,
            'unlike': -2.0,
            'cart_add': 4.0,
            'cart_remove': -1.0,
            'purchase': 10.0,
            'review_positive': 5.0,
            'review_negative': -3.0,
            'wishlist_add': 2.0,
            'wishlist_remove': -1.0,
            'share': 3.0,
            'compare': 1.5,
            'search': 0.5
        }
    
    def update_product_scores(self, product_ids: List[int] = None):
        """
        Update interaction scores for products.
        """
        try:
            if product_ids:
                products = Product.objects.filter(id__in=product_ids, is_active=True)
            else:
                # Update all products (for batch processing)
                products = Product.objects.filter(is_active=True)
            
            for product in products:
                self._update_single_product_score(product)
                
            logger.info(f"Updated scores for {products.count()} products")
            
        except Exception as e:
            logger.error(f"Error updating product scores: {str(e)}")
    
    def _update_single_product_score(self, product: Product):
        """
        Update interaction score for a single product.
        """
        try:
            # Get or create interaction score record
            score_obj, created = ProductInteractionScore.objects.get_or_create(
                product=product,
                defaults={
                    'total_views': 0,
                    'unique_views': 0,
                    'avg_view_duration': 0.0,
                    'total_likes': 0,
                    'total_unlikes': 0,
                    'like_ratio': 0.0,
                    'total_cart_adds': 0,
                    'total_purchases': 0,
                    'conversion_rate': 0.0,
                    'avg_rating': 0.0,
                    'total_reviews': 0,
                    'avg_sentiment': 0.0,
                    'popularity_score': 0.0,
                    'quality_score': 0.0,
                    'trending_score': 0.0,
                    'overall_score': 0.0
                }
            )
            
            # Calculate metrics from user behaviors
            behaviors = UserBehavior.objects.filter(product=product)
            
            # View metrics
            view_behaviors = behaviors.filter(behavior_type='view')
            score_obj.total_views = view_behaviors.count()
            score_obj.unique_views = view_behaviors.values('user').distinct().count()
            
            # Calculate average view duration
            durations = view_behaviors.filter(
                duration_seconds__isnull=False
            ).values_list('duration_seconds', flat=True)
            if durations:
                score_obj.avg_view_duration = np.mean(list(durations))
            
            # Engagement metrics
            score_obj.total_likes = behaviors.filter(behavior_type='like').count()
            score_obj.total_unlikes = behaviors.filter(behavior_type='unlike').count()
            
            total_reactions = score_obj.total_likes + score_obj.total_unlikes
            if total_reactions > 0:
                score_obj.like_ratio = score_obj.total_likes / total_reactions
            
            # Purchase metrics
            score_obj.total_cart_adds = behaviors.filter(behavior_type='cart_add').count()
            score_obj.total_purchases = behaviors.filter(behavior_type='purchase').count()
            
            if score_obj.total_views > 0:
                score_obj.conversion_rate = score_obj.total_purchases / score_obj.total_views
            
            # Review metrics
            review_behaviors = behaviors.filter(
                behavior_type__in=['review_positive', 'review_negative'],
                rating__isnull=False
            )
            if review_behaviors.exists():
                score_obj.avg_rating = review_behaviors.aggregate(
                    avg_rating=Avg('rating')
                )['avg_rating'] or 0.0
                score_obj.total_reviews = review_behaviors.count()
                
                # Calculate sentiment
                sentiment_behaviors = review_behaviors.filter(review_sentiment__isnull=False)
                if sentiment_behaviors.exists():
                    score_obj.avg_sentiment = sentiment_behaviors.aggregate(
                        avg_sentiment=Avg('review_sentiment')
                    )['avg_sentiment'] or 0.0
            
            # Calculate composite scores
            score_obj.popularity_score = self._calculate_popularity_score(score_obj)
            score_obj.quality_score = self._calculate_quality_score(score_obj)
            score_obj.trending_score = self._calculate_trending_score(product)
            score_obj.overall_score = self._calculate_overall_score(score_obj)
            
            score_obj.save()
            
        except Exception as e:
            logger.error(f"Error updating score for product {product.id}: {str(e)}")
    
    def _calculate_popularity_score(self, score_obj: ProductInteractionScore) -> float:
        """
        Calculate popularity score based on views and engagement.
        """
        try:
            # Normalize metrics (0-1 scale)
            view_score = min(score_obj.total_views / 1000.0, 1.0)  # Max at 1000 views
            unique_view_score = min(score_obj.unique_views / 500.0, 1.0)  # Max at 500 unique views
            like_score = score_obj.like_ratio
            cart_score = min(score_obj.total_cart_adds / 100.0, 1.0)  # Max at 100 cart adds
            
            # Weighted combination
            popularity = (
                view_score * 0.3 +
                unique_view_score * 0.3 +
                like_score * 0.2 +
                cart_score * 0.2
            )
            
            return min(popularity, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating popularity score: {str(e)}")
            return 0.0
    
    def _calculate_quality_score(self, score_obj: ProductInteractionScore) -> float:
        """
        Calculate quality score based on ratings and sentiment.
        """
        try:
            # Rating score (0-1 scale, 5-star rating)
            rating_score = score_obj.avg_rating / 5.0 if score_obj.avg_rating > 0 else 0.5
            
            # Sentiment score (convert -1 to 1 range to 0-1 range)
            sentiment_score = (score_obj.avg_sentiment + 1) / 2 if score_obj.avg_sentiment != 0 else 0.5
            
            # Conversion rate as quality indicator
            conversion_score = min(score_obj.conversion_rate * 10, 1.0)  # Max at 10% conversion
            
            # Review count factor (more reviews = more reliable)
            review_factor = min(score_obj.total_reviews / 50.0, 1.0)  # Max factor at 50 reviews
            
            # Weighted combination
            quality = (
                rating_score * 0.4 +
                sentiment_score * 0.3 +
                conversion_score * 0.2 +
                review_factor * 0.1
            )
            
            return min(quality, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating quality score: {str(e)}")
            return 0.5
    
    def _calculate_trending_score(self, product: Product) -> float:
        """
        Calculate trending score based on recent activity.
        """
        try:
            # Get recent behaviors (last 7 days)
            recent_behaviors = UserBehavior.objects.filter(
                product=product,
                timestamp__gte=timezone.now() - timedelta(days=7)
            )
            
            if not recent_behaviors.exists():
                return 0.0
            
            # Calculate weighted activity score
            total_score = 0.0
            for behavior in recent_behaviors:
                weight = self.behavior_weights.get(behavior.behavior_type, 1.0)
                
                # Time decay factor (more recent = higher weight)
                days_ago = (timezone.now() - behavior.timestamp).days
                time_factor = max(0.1, 1.0 - (days_ago / 7.0))
                
                total_score += weight * time_factor
            
            # Normalize score
            trending_score = min(total_score / 100.0, 1.0)  # Max at 100 weighted points
            
            return trending_score
            
        except Exception as e:
            logger.error(f"Error calculating trending score for product {product.id}: {str(e)}")
            return 0.0
    
    def _calculate_overall_score(self, score_obj: ProductInteractionScore) -> float:
        """
        Calculate overall score combining all metrics.
        """
        try:
            # Weighted combination of all scores
            overall = (
                score_obj.popularity_score * 0.35 +
                score_obj.quality_score * 0.35 +
                score_obj.trending_score * 0.30
            )
            
            return min(overall, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating overall score: {str(e)}")
            return 0.0
    
    def calculate_user_similarities(self, user_ids: List[int] = None):
        """
        Calculate user similarity scores for collaborative filtering.
        """
        try:
            if user_ids:
                users = User.objects.filter(id__in=user_ids)
            else:
                # Calculate for active users only
                users = User.objects.filter(
                    userbehavior__timestamp__gte=timezone.now() - timedelta(days=30)
                ).distinct()[:1000]  # Limit to prevent performance issues
            
            user_list = list(users)
            
            for i, user1 in enumerate(user_list):
                for user2 in user_list[i+1:]:
                    similarity_score = self._calculate_cosine_similarity(user1, user2)
                    
                    if similarity_score > 0.1:  # Only store meaningful similarities
                        # Get common products count
                        user1_products = set(UserBehavior.objects.filter(
                            user=user1,
                            behavior_type__in=['like', 'purchase', 'cart_add']
                        ).values_list('product_id', flat=True))
                        
                        user2_products = set(UserBehavior.objects.filter(
                            user=user2,
                            behavior_type__in=['like', 'purchase', 'cart_add']
                        ).values_list('product_id', flat=True))
                        
                        common_products = len(user1_products.intersection(user2_products))
                        
                        # Update or create similarity record
                        UserSimilarity.objects.update_or_create(
                            user1=user1,
                            user2=user2,
                            defaults={
                                'similarity_score': similarity_score,
                                'common_products': common_products
                            }
                        )
            
            logger.info(f"Updated similarities for {len(user_list)} users")
            
        except Exception as e:
            logger.error(f"Error calculating user similarities: {str(e)}")
    
    def _calculate_cosine_similarity(self, user1: User, user2: User) -> float:
        """
        Calculate cosine similarity between two users based on their behaviors.
        """
        try:
            # Get user behaviors with weights
            user1_behaviors = self._get_user_behavior_vector(user1)
            user2_behaviors = self._get_user_behavior_vector(user2)
            
            if not user1_behaviors or not user2_behaviors:
                return 0.0
            
            # Find common products
            common_products = set(user1_behaviors.keys()).intersection(set(user2_behaviors.keys()))
            
            if len(common_products) < 2:  # Need at least 2 common products
                return 0.0
            
            # Calculate cosine similarity
            dot_product = sum(user1_behaviors[product] * user2_behaviors[product] 
                            for product in common_products)
            
            norm1 = np.sqrt(sum(score ** 2 for score in user1_behaviors.values()))
            norm2 = np.sqrt(sum(score ** 2 for score in user2_behaviors.values()))
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return max(0.0, min(1.0, similarity))
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {str(e)}")
            return 0.0
    
    def _get_user_behavior_vector(self, user: User) -> Dict[int, float]:
        """
        Get user's behavior vector (product_id -> weighted_score).
        """
        try:
            behaviors = UserBehavior.objects.filter(
                user=user,
                timestamp__gte=timezone.now() - timedelta(days=60)
            )
            
            behavior_vector = {}
            
            for behavior in behaviors:
                product_id = behavior.product_id
                weight = self.behavior_weights.get(behavior.behavior_type, 1.0)
                
                if product_id not in behavior_vector:
                    behavior_vector[product_id] = 0.0
                
                behavior_vector[product_id] += weight
            
            return behavior_vector
            
        except Exception as e:
            logger.error(f"Error getting user behavior vector: {str(e)}")
            return {}
    
    def log_user_behavior(
        self,
        user_id: int = None,
        session_id: str = None,
        product_id: int = None,
        behavior_type: str = None,
        **kwargs
    ):
        """
        Log user behavior for recommendation system.
        """
        try:
            if not product_id or not behavior_type:
                logger.warning("Missing required parameters for behavior logging")
                return False
            
            # Get user if provided
            user = None
            if user_id:
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    logger.warning(f"User {user_id} not found")
            
            # Get product
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                logger.warning(f"Product {product_id} not found")
                return False
            
            # Create behavior record
            behavior_data = {
                'user': user,
                'session_id': session_id,
                'product': product,
                'behavior_type': behavior_type,
                'ip_address': kwargs.get('ip_address'),
                'user_agent': kwargs.get('user_agent'),
                'duration_seconds': kwargs.get('duration_seconds'),
                'rating': kwargs.get('rating'),
                'review_sentiment': kwargs.get('review_sentiment'),
                'search_query': kwargs.get('search_query'),
                'referrer_page': kwargs.get('referrer_page')
            }
            
            UserBehavior.objects.create(**behavior_data)
            
            # Update product score immediately for important behaviors
            if behavior_type in ['purchase', 'like', 'cart_add']:
                self._update_single_product_score(product)
            
            return True
            
        except Exception as e:
            logger.error(f"Error logging user behavior: {str(e)}")
            return False