"""
Advanced AI-powered recommendation engine.
Combines multiple algorithms for personalized product recommendations.
"""

import numpy as np
from django.db.models import Q, F, Count, Avg, Sum, Case, When, FloatField
from django.utils import timezone
from datetime import timedelta
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import logging

from products.models import Product, Category, Brand
from recommendations.models import (
    UserBehavior, ProductInteractionScore, UserSimilarity, 
    UserPreference, RecommendationSession, RecommendationResult
)
from django.contrib.auth import get_user_model

User = get_user_model()
logger = logging.getLogger(__name__)


class SmartRecommendationEngine:
    """
    Advanced recommendation engine using multiple ML techniques.
    """
    
    def __init__(self):
        self.weights = {
            'collaborative': 0.3,
            'content_based': 0.25,
            'popularity': 0.2,
            'trending': 0.15,
            'behavioral': 0.1
        }
    
    def get_personalized_recommendations(
        self, 
        user: User, 
        limit: int = 20,
        category_id: Optional[int] = None,
        exclude_products: List[int] = None
    ) -> List[Dict]:
        """
        Generate personalized recommendations using hybrid approach.
        """
        if exclude_products is None:
            exclude_products = []
            
        try:
            # Get user's interaction history
            user_behaviors = self._get_user_behaviors(user)
            
            if not user_behaviors:
                # New user - use popularity-based recommendations
                return self._get_popularity_based_recommendations(
                    limit=limit, 
                    category_id=category_id,
                    exclude_products=exclude_products
                )
            
            # Combine multiple recommendation strategies
            recommendations = {}
            
            # 1. Collaborative Filtering
            collab_recs = self._collaborative_filtering(user, limit * 2)
            self._merge_recommendations(recommendations, collab_recs, 'collaborative')
            
            # 2. Content-Based Filtering
            content_recs = self._content_based_filtering(user, limit * 2)
            self._merge_recommendations(recommendations, content_recs, 'content_based')
            
            # 3. Behavioral Pattern Matching
            behavioral_recs = self._behavioral_pattern_matching(user, limit * 2)
            self._merge_recommendations(recommendations, behavioral_recs, 'behavioral')
            
            # 4. Trending Products
            trending_recs = self._get_trending_recommendations(limit)
            self._merge_recommendations(recommendations, trending_recs, 'trending')
            
            # 5. Popular Products (fallback)
            popular_recs = self._get_popularity_based_recommendations(limit)
            self._merge_recommendations(recommendations, popular_recs, 'popularity')
            
            # Calculate final scores and rank
            final_recommendations = self._calculate_final_scores(recommendations)
            
            # Filter and format results
            filtered_recs = self._filter_and_format_recommendations(
                final_recommendations,
                user=user,
                limit=limit,
                category_id=category_id,
                exclude_products=exclude_products
            )
            
            return filtered_recs
            
        except Exception as e:
            logger.error(f"Error in personalized recommendations for user {user.id}: {str(e)}")
            # Fallback to popular products
            return self._get_popularity_based_recommendations(
                limit=limit,
                category_id=category_id,
                exclude_products=exclude_products
            )
    
    def _get_user_behaviors(self, user: User) -> Dict:
        """Get user's behavior patterns."""
        behaviors = UserBehavior.objects.filter(
            user=user,
            timestamp__gte=timezone.now() - timedelta(days=90)
        ).select_related('product')
        
        behavior_data = {
            'viewed_products': [],
            'liked_products': [],
            'purchased_products': [],
            'cart_products': [],
            'categories': defaultdict(int),
            'brands': defaultdict(int),
            'price_ranges': []
        }
        
        for behavior in behaviors:
            product = behavior.product
            
            if behavior.behavior_type == 'view':
                behavior_data['viewed_products'].append(product.id)
            elif behavior.behavior_type == 'like':
                behavior_data['liked_products'].append(product.id)
            elif behavior.behavior_type == 'purchase':
                behavior_data['purchased_products'].append(product.id)
            elif behavior.behavior_type == 'cart_add':
                behavior_data['cart_products'].append(product.id)
            
            # Track preferences
            if product.category:
                behavior_data['categories'][product.category.id] += 1
            if hasattr(product, 'brand') and product.brand:
                behavior_data['brands'][product.brand.id] += 1
            if product.price:
                behavior_data['price_ranges'].append(float(product.price))
        
        return behavior_data
    
    def _collaborative_filtering(self, user: User, limit: int) -> List[Dict]:
        """
        Collaborative filtering based on user similarities.
        """
        try:
            # Find similar users
            similar_users = UserSimilarity.objects.filter(
                Q(user1=user) | Q(user2=user),
                similarity_score__gte=0.3
            ).order_by('-similarity_score')[:20]
            
            if not similar_users:
                return []
            
            # Get products liked by similar users
            similar_user_ids = []
            for similarity in similar_users:
                if similarity.user1 == user:
                    similar_user_ids.append(similarity.user2.id)
                else:
                    similar_user_ids.append(similarity.user1.id)
            
            # Get products liked by similar users but not by current user
            user_products = set(UserBehavior.objects.filter(
                user=user,
                behavior_type__in=['like', 'purchase', 'cart_add']
            ).values_list('product_id', flat=True))
            
            recommended_products = UserBehavior.objects.filter(
                user_id__in=similar_user_ids,
                behavior_type__in=['like', 'purchase'],
                timestamp__gte=timezone.now() - timedelta(days=60)
            ).exclude(
                product_id__in=user_products
            ).values('product_id').annotate(
                score=Count('id')
            ).order_by('-score')[:limit]
            
            recommendations = []
            for item in recommended_products:
                recommendations.append({
                    'product_id': item['product_id'],
                    'score': min(item['score'] / 10.0, 1.0),  # Normalize score
                    'algorithm': 'collaborative_filtering'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in collaborative filtering: {str(e)}")
            return []
    
    def _content_based_filtering(self, user: User, limit: int) -> List[Dict]:
        """
        Content-based filtering based on product features.
        """
        try:
            # Get user's preferred categories and brands
            user_behaviors = UserBehavior.objects.filter(
                user=user,
                behavior_type__in=['like', 'purchase', 'view'],
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).select_related('product', 'product__category')
            
            category_scores = defaultdict(int)
            brand_scores = defaultdict(int)
            price_preferences = []
            
            for behavior in user_behaviors:
                weight = {'like': 3, 'purchase': 5, 'view': 1}.get(behavior.behavior_type, 1)
                
                if behavior.product.category:
                    category_scores[behavior.product.category.id] += weight
                if hasattr(behavior.product, 'brand') and behavior.product.brand:
                    brand_scores[behavior.product.brand.id] += weight
                if behavior.product.price:
                    price_preferences.append(float(behavior.product.price))
            
            if not category_scores and not brand_scores:
                return []
            
            # Find products with similar features
            query = Q()
            
            # Preferred categories
            if category_scores:
                top_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)[:3]
                category_ids = [cat_id for cat_id, _ in top_categories]
                query |= Q(category_id__in=category_ids)
            
            # Preferred brands
            if brand_scores:
                top_brands = sorted(brand_scores.items(), key=lambda x: x[1], reverse=True)[:3]
                brand_ids = [brand_id for brand_id, _ in top_brands]
                query |= Q(brand_id__in=brand_ids)
            
            # Price range preference
            if price_preferences:
                avg_price = np.mean(price_preferences)
                price_std = np.std(price_preferences) if len(price_preferences) > 1 else avg_price * 0.3
                min_price = max(0, avg_price - price_std)
                max_price = avg_price + price_std
                query &= Q(price__gte=min_price, price__lte=max_price)
            
            # Exclude products user already interacted with
            user_products = UserBehavior.objects.filter(
                user=user,
                behavior_type__in=['like', 'purchase', 'cart_add']
            ).values_list('product_id', flat=True)
            
            products = Product.objects.filter(query).exclude(
                id__in=user_products
            ).filter(is_active=True).annotate(
                interaction_score=F('interaction_score__overall_score')
            ).order_by('-interaction_score')[:limit]
            
            recommendations = []
            for product in products:
                score = 0.5  # Base score
                
                # Boost score based on category preference
                if product.category_id in category_scores:
                    score += (category_scores[product.category_id] / 10.0) * 0.3
                
                # Boost score based on brand preference
                if hasattr(product, 'brand') and product.brand and product.brand.id in brand_scores:
                    score += (brand_scores[product.brand.id] / 10.0) * 0.2
                
                recommendations.append({
                    'product_id': product.id,
                    'score': min(score, 1.0),
                    'algorithm': 'content_based_filtering'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in content-based filtering: {str(e)}")
            return []
    
    def _behavioral_pattern_matching(self, user: User, limit: int) -> List[Dict]:
        """
        Recommendations based on behavioral patterns.
        """
        try:
            # Get recent user behaviors
            recent_behaviors = UserBehavior.objects.filter(
                user=user,
                timestamp__gte=timezone.now() - timedelta(days=7)
            ).select_related('product')
            
            if not recent_behaviors:
                return []
            
            # Analyze patterns
            viewed_categories = set()
            search_queries = []
            
            for behavior in recent_behaviors:
                if behavior.product.category:
                    viewed_categories.add(behavior.product.category.id)
                if behavior.search_query:
                    search_queries.append(behavior.search_query.lower())
            
            # Find products in similar categories or matching search patterns
            query = Q()
            if viewed_categories:
                query |= Q(category_id__in=viewed_categories)
            
            # Exclude already interacted products
            user_products = UserBehavior.objects.filter(
                user=user
            ).values_list('product_id', flat=True)
            
            products = Product.objects.filter(query).exclude(
                id__in=user_products
            ).filter(is_active=True).annotate(
                trending_score=F('interaction_score__trending_score')
            ).order_by('-trending_score')[:limit]
            
            recommendations = []
            for product in products:
                recommendations.append({
                    'product_id': product.id,
                    'score': 0.6,
                    'algorithm': 'behavioral_pattern_matching'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in behavioral pattern matching: {str(e)}")
            return []
    
    def _get_trending_recommendations(self, limit: int) -> List[Dict]:
        """Get trending products based on recent activity."""
        try:
            trending_products = ProductInteractionScore.objects.filter(
                trending_score__gt=0
            ).order_by('-trending_score')[:limit]
            
            recommendations = []
            for score_obj in trending_products:
                recommendations.append({
                    'product_id': score_obj.product.id,
                    'score': min(score_obj.trending_score, 1.0),
                    'algorithm': 'trending_products'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting trending recommendations: {str(e)}")
            return []
    
    def _get_popularity_based_recommendations(
        self, 
        limit: int, 
        category_id: Optional[int] = None,
        exclude_products: List[int] = None
    ) -> List[Dict]:
        """Get popular products as fallback."""
        try:
            if exclude_products is None:
                exclude_products = []
                
            query = Q(is_active=True)
            if category_id:
                query &= Q(category_id=category_id)
            if exclude_products:
                query &= ~Q(id__in=exclude_products)
            
            products = Product.objects.filter(query).annotate(
                popularity=F('interaction_score__popularity_score')
            ).order_by('-popularity')[:limit]
            
            recommendations = []
            for product in products:
                recommendations.append({
                    'product_id': product.id,
                    'score': 0.5,
                    'algorithm': 'popularity_based'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting popularity recommendations: {str(e)}")
            return []
    
    def _merge_recommendations(self, recommendations: Dict, new_recs: List[Dict], algorithm: str):
        """Merge recommendations from different algorithms."""
        for rec in new_recs:
            product_id = rec['product_id']
            if product_id not in recommendations:
                recommendations[product_id] = {
                    'product_id': product_id,
                    'scores': {},
                    'algorithms': []
                }
            
            recommendations[product_id]['scores'][algorithm] = rec['score']
            recommendations[product_id]['algorithms'].append(rec['algorithm'])
    
    def _calculate_final_scores(self, recommendations: Dict) -> List[Dict]:
        """Calculate final weighted scores."""
        final_recs = []
        
        for product_id, data in recommendations.items():
            final_score = 0.0
            
            for algorithm, weight in self.weights.items():
                if algorithm in data['scores']:
                    final_score += data['scores'][algorithm] * weight
            
            # Boost score if multiple algorithms agree
            algorithm_count = len(data['scores'])
            if algorithm_count > 1:
                final_score *= (1 + (algorithm_count - 1) * 0.1)
            
            final_recs.append({
                'product_id': product_id,
                'score': min(final_score, 1.0),
                'algorithms': data['algorithms']
            })
        
        return sorted(final_recs, key=lambda x: x['score'], reverse=True)
    
    def _filter_and_format_recommendations(
        self,
        recommendations: List[Dict],
        user: User,
        limit: int,
        category_id: Optional[int] = None,
        exclude_products: List[int] = None
    ) -> List[Dict]:
        """Filter and format final recommendations."""
        if exclude_products is None:
            exclude_products = []
        
        # Get product details
        product_ids = [rec['product_id'] for rec in recommendations]
        products = Product.objects.filter(
            id__in=product_ids,
            is_active=True
        ).select_related('category', 'brand')
        
        if category_id:
            products = products.filter(category_id=category_id)
        
        if exclude_products:
            products = products.exclude(id__in=exclude_products)
        
        # Create product lookup
        product_lookup = {p.id: p for p in products}
        
        # Format results
        formatted_recs = []
        for rec in recommendations:
            if rec['product_id'] in product_lookup and len(formatted_recs) < limit:
                product = product_lookup[rec['product_id']]
                formatted_recs.append({
                    'product_id': product.id,
                    'score': rec['score'],
                    'algorithm': ', '.join(rec['algorithms'][:2])  # Show top 2 algorithms
                })
        
        return formatted_recs