"""
AI/ML services for smart search, recommendations, and analysis.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional
from django.db.models import Q, Count, Avg, F
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from products.models import Product, Category, Store
from .models import UserBehaviorLog, UserSessionInteraction
import random

User = get_user_model()
logger = logging.getLogger(__name__)


class SearchService:
    """
    AI-powered search enhancement service.
    """
    
    def __init__(self):
        self.common_typos = {
            'iphone': ['iphone', 'iphone', 'iphon', 'ifone'],
            'samsung': ['samsung', 'samsng', 'samung'],
            'laptop': ['laptop', 'laptap', 'leptop'],
            'phone': ['phone', 'fone', 'phon'],
        }
    
    def enhance_search_query(self, query: str) -> str:
        """
        Enhance search query with spell correction and semantic understanding.
        """
        try:
            # Basic spell correction
            corrected_query = self._spell_correct(query.lower())
            
            # Expand with synonyms
            expanded_query = self._expand_synonyms(corrected_query)
            
            logger.info(f"Enhanced search: '{query}' -> '{expanded_query}'")
            return expanded_query
            
        except Exception as e:
            logger.error(f"Error enhancing search query: {str(e)}")
            return query
    
    def _spell_correct(self, query: str) -> str:
        """
        Basic spell correction using common typos dictionary.
        """
        words = query.split()
        corrected_words = []
        
        for word in words:
            corrected = word
            for correct_word, typos in self.common_typos.items():
                if word in typos:
                    corrected = correct_word
                    break
            corrected_words.append(corrected)
        
        return ' '.join(corrected_words)
    
    def _expand_synonyms(self, query: str) -> str:
        """
        Expand query with synonyms for better matching.
        """
        synonyms = {
            'phone': ['smartphone', 'mobile', 'cellphone'],
            'laptop': ['notebook', 'computer'],
            'cheap': ['affordable', 'budget', 'inexpensive'],
            'expensive': ['premium', 'high-end', 'luxury'],
        }
        
        expanded_terms = [query]
        words = query.split()
        
        for word in words:
            if word in synonyms:
                expanded_terms.extend(synonyms[word])
        
        return ' '.join(expanded_terms)
    
    def get_search_suggestions(self, partial_query: str, limit: int = 5) -> List[str]:
        """
        Get search suggestions based on partial query.
        """
        try:
            # Get popular search terms from behavior logs
            popular_searches = UserBehaviorLog.objects.filter(
                action_type='search',
                metadata__search_query__icontains=partial_query
            ).values('metadata__search_query').annotate(
                count=Count('id')
            ).order_by('-count')[:limit]
            
            suggestions = [item['metadata__search_query'] for item in popular_searches]
            
            # Add product name suggestions
            product_suggestions = Product.objects.filter(
                name__icontains=partial_query,
                is_active=True
            ).values_list('name', flat=True)[:limit-len(suggestions)]
            
            suggestions.extend(product_suggestions)
            
            return suggestions[:limit]
            
        except Exception as e:
            logger.error(f"Error getting search suggestions: {str(e)}")
            return []


class RecommendationService:
    """
    AI-powered recommendation engine using hybrid approach.
    """
    
    def get_general_recommendations(self, limit: int = 10, category_id: Optional[int] = None, 
                                  exclude_products: List[int] = None) -> List[Dict]:
        """
        Get general recommendations based on popularity and trends.
        """
        try:
            exclude_products = exclude_products or []
            
            # Base queryset
            queryset = Product.objects.filter(is_active=True).exclude(id__in=exclude_products)
            
            if category_id:
                queryset = queryset.filter(category_id=category_id)
            
            # Get trending products (high view count, recent activity)
            trending_products = queryset.annotate(
                popularity_score=F('view_count') + F('total_reviews') * 2 + F('average_rating') * 10
            ).order_by('-popularity_score')[:limit]
            
            recommendations = []
            for product in trending_products:
                recommendations.append({
                    'product_id': product.id,
                    'name': product.name,
                    'price': float(product.get_final_price()),
                    'rating': product.average_rating,
                    'score': 0.8,  # General recommendation confidence
                    'algorithm': 'trending_popularity',
                    'reason': 'Popular and highly rated'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating general recommendations: {str(e)}")
            return []
    
    def get_personalized_recommendations(self, user: User, limit: int = 10,
                                       category_id: Optional[int] = None,
                                       exclude_products: List[int] = None) -> List[Dict]:
        """
        Get personalized recommendations based on user behavior and preferences.
        """
        try:
            exclude_products = exclude_products or []
            logger.info(f"Getting personalized recommendations for user {user.id}, limit: {limit}")

            # Get user's interaction history
            user_interactions = UserBehaviorLog.objects.filter(
                user=user,
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).select_related('product')

            logger.info(f"Found {user_interactions.count()} user interactions in the last 30 days")

            # Analyze user preferences
            viewed_categories = set()
            liked_products = []
            viewed_brands = set()

            for interaction in user_interactions:
                if interaction.product:
                    if interaction.action_type == 'view':
                        viewed_categories.add(interaction.product.category_id)
                        viewed_brands.add(interaction.product.brand_id)
                    elif interaction.action_type == 'like':
                        liked_products.append(interaction.product)

            logger.info(f"User preferences - Categories: {len(viewed_categories)}, Brands: {len(viewed_brands)}, Liked products: {len(liked_products)}")
            
            # Content-based filtering
            content_based = self._get_content_based_recommendations(
                viewed_categories, viewed_brands, exclude_products, limit//2
            )
            logger.info(f"Content-based recommendations: {len(content_based)}")

            # Collaborative filtering (simplified)
            collaborative = self._get_collaborative_recommendations(
                user, exclude_products, limit//2
            )
            logger.info(f"Collaborative filtering recommendations: {len(collaborative)}")

            # Combine recommendations
            all_recommendations = content_based + collaborative
            logger.info(f"Total combined recommendations: {len(all_recommendations)}")

            # Remove duplicates and limit
            seen_products = set()
            final_recommendations = []

            for rec in all_recommendations:
                if rec['product_id'] not in seen_products and len(final_recommendations) < limit:
                    seen_products.add(rec['product_id'])
                    final_recommendations.append(rec)

            logger.info(f"Final personalized recommendations count: {len(final_recommendations)}")
            return final_recommendations
            
        except Exception as e:
            logger.error(f"Error generating personalized recommendations: {str(e)}")
            return self.get_general_recommendations(limit, category_id, exclude_products)
    
    def _get_content_based_recommendations(self, viewed_categories: set, viewed_brands: set,
                                         exclude_products: List[int], limit: int) -> List[Dict]:
        """
        Get recommendations based on content similarity.
        """
        recommendations = []
        logger.info(f"Content-based filtering - Categories: {viewed_categories}, Brands: {viewed_brands}, Limit: {limit}")

        if viewed_categories or viewed_brands:
            queryset = Product.objects.filter(is_active=True).exclude(id__in=exclude_products)

            if viewed_categories:
                queryset = queryset.filter(category_id__in=viewed_categories)

            products = queryset.order_by('-average_rating', '-view_count')[:limit]
            logger.info(f"Found {products.count()} products for content-based recommendations")

            for product in products:
                try:
                    recommendations.append({
                        'product_id': product.id,
                        'name': product.name,
                        'price': float(product.get_final_price()),
                        'rating': product.average_rating,
                        'score': 0.7,
                        'algorithm': 'content_based',
                        'reason': 'Based on your browsing history'
                    })
                except Exception as e:
                    logger.error(f"Error processing product {product.id} for content-based recommendations: {str(e)}")
                    continue
        else:
            logger.info("No viewed categories or brands found for content-based recommendations")

        logger.info(f"Returning {len(recommendations)} content-based recommendations")
        return recommendations
    
    def _get_collaborative_recommendations(self, user: User, exclude_products: List[int],
                                         limit: int) -> List[Dict]:
        """
        Get recommendations based on collaborative filtering.
        """
        recommendations = []
        logger.info(f"Collaborative filtering for user {user.id}, limit: {limit}")

        # Find users with similar behavior (simplified)
        user_liked_products = UserBehaviorLog.objects.filter(
            user=user,
            action_type='like'
        ).values_list('product_id', flat=True)

        logger.info(f"User has liked {len(user_liked_products)} products")

        if user_liked_products:
            # Find other users who liked similar products
            similar_users = UserBehaviorLog.objects.filter(
                action_type='like',
                product_id__in=user_liked_products
            ).exclude(user=user).values_list('user_id', flat=True).distinct()

            logger.info(f"Found {len(similar_users)} similar users")

            # Get products liked by similar users
            recommended_products = UserBehaviorLog.objects.filter(
                user_id__in=similar_users,
                action_type='like'
            ).exclude(
                product_id__in=list(user_liked_products) + exclude_products
            ).values('product_id').annotate(
                like_count=Count('id')
            ).order_by('-like_count')[:limit]

            logger.info(f"Found {recommended_products.count()} potential collaborative recommendations")

            for item in recommended_products:
                try:
                    product = Product.objects.get(id=item['product_id'], is_active=True)
                    recommendations.append({
                        'product_id': product.id,
                        'name': product.name,
                        'price': float(product.get_final_price()),
                        'rating': product.average_rating,
                        'score': min(0.9, item['like_count'] / 10),
                        'algorithm': 'collaborative_filtering',
                        'reason': 'Users with similar taste also liked this'
                    })
                except Product.DoesNotExist:
                    logger.warning(f"Product {item['product_id']} not found or inactive")
                    continue
                except Exception as e:
                    logger.error(f"Error processing collaborative recommendation for product {item['product_id']}: {str(e)}")
                    continue
        else:
            logger.info("No liked products found for collaborative filtering")

        logger.info(f"Returning {len(recommendations)} collaborative recommendations")
        return recommendations
    
    def get_similar_products(self, product: Product, limit: int = 10) -> List[Dict]:
        """
        Get products similar to the given product.
        """
        try:
            # Find products in same category and brand
            similar_products = Product.objects.filter(
                category=product.category,
                is_active=True
            ).exclude(id=product.id)
            
            # Prioritize same brand
            same_brand = similar_products.filter(brand=product.brand)[:limit//2]
            other_brand = similar_products.exclude(brand=product.brand)[:limit//2]
            
            recommendations = []
            
            for similar_product in list(same_brand) + list(other_brand):
                # Calculate similarity score based on price range and attributes
                price_similarity = self._calculate_price_similarity(product, similar_product)
                
                recommendations.append({
                    'product_id': similar_product.id,
                    'name': similar_product.name,
                    'price': float(similar_product.get_final_price()),
                    'rating': similar_product.average_rating,
                    'score': price_similarity,
                    'algorithm': 'content_similarity',
                    'reason': 'Similar product in same category'
                })
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error getting similar products: {str(e)}")
            return []
    
    def _calculate_price_similarity(self, product1: Product, product2: Product) -> float:
        """
        Calculate price similarity between two products.
        """
        price1 = float(product1.get_final_price())
        price2 = float(product2.get_final_price())
        
        if price1 == 0 or price2 == 0:
            return 0.5
        
        ratio = min(price1, price2) / max(price1, price2)
        return ratio
    
    def get_realtime_personalization(self, user: User, session_id: str) -> Dict:
        """
        Get real-time personalized content based on current session behavior.
        """
        try:
            # Get recent session interactions
            recent_interactions = UserSessionInteraction.objects.filter(
                session_id=session_id,
                timestamp__gte=timezone.now() - timedelta(hours=1)
            ).order_by('-timestamp')[:10]
            
            personalization_data = {
                'recently_viewed': [],
                'suggested_categories': [],
                'trending_now': [],
                'frequently_bought_together': []
            }
            
            # Recently viewed products
            viewed_products = []
            for interaction in recent_interactions:
                if interaction.product and interaction.interaction_type == 'view':
                    viewed_products.append({
                        'product_id': interaction.product.id,
                        'name': interaction.product.name,
                        'price': float(interaction.product.get_final_price()),
                        'image_url': interaction.product.image_urls[0] if interaction.product.image_urls else None
                    })
            
            personalization_data['recently_viewed'] = viewed_products[:5]
            
            # Suggested categories based on browsing
            if viewed_products:
                category_ids = [p['product_id'] for p in viewed_products]
                categories = Category.objects.filter(
                    products__id__in=category_ids
                ).distinct()[:3]
                
                personalization_data['suggested_categories'] = [
                    {'id': cat.id, 'name': cat.name} for cat in categories
                ]
            
            return personalization_data
            
        except Exception as e:
            logger.error(f"Error generating realtime personalization: {str(e)}")
            return {}
    
    def get_best_products(self, category_id: Optional[int] = None, limit: int = 10) -> List[Dict]:
        """
        Get AI-determined best products based on multiple factors.
        """
        try:
            queryset = Product.objects.filter(is_active=True)
            
            if category_id:
                queryset = queryset.filter(category_id=category_id)
            
            # Calculate composite score
            products = queryset.annotate(
                composite_score=(
                    F('average_rating') * 0.4 +
                    F('total_reviews') * 0.3 +
                    (F('view_count') / 100) * 0.2 +
                    (100 - F('discount_percentage')) * 0.1
                )
            ).order_by('-composite_score')[:limit]
            
            recommendations = []
            for product in products:
                recommendations.append({
                    'product_id': product.id,
                    'name': product.name,
                    'price': float(product.get_final_price()),
                    'rating': product.average_rating,
                    'score': 0.9,
                    'algorithm': 'best_product_ai',
                    'reason': 'AI-determined best value based on ratings, reviews, and popularity'
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting best products: {str(e)}")
            return []


class ComparisonService:
    """
    AI-powered product and store comparison service.
    """
    
    def compare_products(self, products: List[Product], criteria: List[str] = None,
                        include_recommendation: bool = True) -> Dict:
        """
        Compare multiple products using AI analysis.
        """
        try:
            criteria = criteria or ['price', 'rating', 'features', 'value']
            
            comparison_data = {
                'criteria': criteria,
                'analysis': {
                    'products': [],
                    'summary': '',
                    'recommendation': None
                }
            }
            
            # Analyze each product
            for product in products:
                product_analysis = {
                    'product_id': product.id,
                    'name': product.name,
                    'scores': {},
                    'strengths': [],
                    'weaknesses': []
                }
                
                # Price analysis
                if 'price' in criteria:
                    prices = [p.get_final_price() for p in products]
                    min_price = min(prices)
                    price_score = (min_price / product.get_final_price()) * 100
                    product_analysis['scores']['price'] = round(price_score, 1)
                    
                    if product.get_final_price() == min_price:
                        product_analysis['strengths'].append('Best price')
                    elif price_score < 70:
                        product_analysis['weaknesses'].append('Higher price')
                
                # Rating analysis
                if 'rating' in criteria:
                    rating_score = (product.average_rating / 5) * 100
                    product_analysis['scores']['rating'] = round(rating_score, 1)
                    
                    if product.average_rating >= 4.5:
                        product_analysis['strengths'].append('Excellent ratings')
                    elif product.average_rating < 3.5:
                        product_analysis['weaknesses'].append('Lower ratings')
                
                # Features analysis (simplified)
                if 'features' in criteria:
                    feature_count = len(product.attributes.keys()) if product.attributes else 0
                    max_features = max(len(p.attributes.keys()) if p.attributes else 0 for p in products)
                    feature_score = (feature_count / max_features * 100) if max_features > 0 else 50
                    product_analysis['scores']['features'] = round(feature_score, 1)
                
                # Value analysis
                if 'value' in criteria:
                    value_score = (product_analysis['scores'].get('rating', 50) + 
                                 product_analysis['scores'].get('price', 50)) / 2
                    product_analysis['scores']['value'] = round(value_score, 1)
                
                comparison_data['analysis']['products'].append(product_analysis)
            
            # Generate summary and recommendation
            if include_recommendation:
                best_product = max(
                    comparison_data['analysis']['products'],
                    key=lambda p: sum(p['scores'].values()) / len(p['scores'])
                )
                
                comparison_data['analysis']['recommendation'] = {
                    'product_id': best_product['product_id'],
                    'reason': 'Best overall value based on selected criteria'
                }
                
                comparison_data['analysis']['summary'] = self._generate_comparison_summary(
                    comparison_data['analysis']['products']
                )
            
            return comparison_data
            
        except Exception as e:
            logger.error(f"Error comparing products: {str(e)}")
            return {'error': 'Comparison failed'}
    
    def compare_stores(self, stores: List[Store], comparison_type: str = 'general',
                      category_id: Optional[int] = None) -> Dict:
        """
        Compare multiple stores using AI analysis.
        """
        try:
            comparison_data = {
                'comparison_type': comparison_type,
                'stores': [],
                'insights': []
            }
            
            for store in stores:
                store_analysis = {
                    'store_id': store.id,
                    'name': store.name,
                    'metrics': {
                        'average_rating': store.average_rating,
                        'total_orders': store.total_orders_count,
                        'customer_service_score': store.customer_service_score,
                        'product_count': store.products.filter(is_active=True).count()
                    },
                    'strengths': [],
                    'areas_for_improvement': []
                }
                
                # Analyze based on comparison type
                if comparison_type == 'service_quality':
                    if store.customer_service_score >= 4.5:
                        store_analysis['strengths'].append('Excellent customer service')
                    elif store.customer_service_score < 3.5:
                        store_analysis['areas_for_improvement'].append('Customer service needs improvement')
                
                if comparison_type == 'price_analysis' and category_id:
                    # Analyze average prices in category
                    avg_price = store.products.filter(
                        category_id=category_id,
                        is_active=True
                    ).aggregate(avg_price=Avg('price'))['avg_price']
                    
                    if avg_price:
                        store_analysis['metrics']['avg_category_price'] = float(avg_price)
                
                comparison_data['stores'].append(store_analysis)
            
            # Generate insights
            comparison_data['insights'] = self._generate_store_insights(comparison_data['stores'])
            
            return comparison_data
            
        except Exception as e:
            logger.error(f"Error comparing stores: {str(e)}")
            return {'error': 'Store comparison failed'}
    
    def _generate_comparison_summary(self, product_analyses: List[Dict]) -> str:
        """
        Generate AI summary of product comparison.
        """
        try:
            best_price = min(product_analyses, key=lambda p: p['scores'].get('price', 0))
            best_rating = max(product_analyses, key=lambda p: p['scores'].get('rating', 0))
            
            summary = f"Among the compared products, {best_price['name']} offers the best price value, "
            summary += f"while {best_rating['name']} has the highest customer ratings. "
            
            # Add more insights based on scores
            avg_scores = {}
            for product in product_analyses:
                for criterion, score in product['scores'].items():
                    if criterion not in avg_scores:
                        avg_scores[criterion] = []
                    avg_scores[criterion].append(score)
            
            for criterion, scores in avg_scores.items():
                avg_score = sum(scores) / len(scores)
                if avg_score > 80:
                    summary += f"All products perform well in {criterion}. "
                elif avg_score < 60:
                    summary += f"Consider {criterion} carefully as scores vary significantly. "
            
            return summary
            
        except Exception as e:
            logger.error(f"Error generating comparison summary: {str(e)}")
            return "Comparison completed successfully."
    
    def _generate_store_insights(self, store_analyses: List[Dict]) -> List[str]:
        """
        Generate insights from store comparison.
        """
        insights = []
        
        try:
            # Find best performing store
            best_rating = max(store_analyses, key=lambda s: s['metrics']['average_rating'])
            insights.append(f"{best_rating['name']} has the highest customer satisfaction rating.")
            
            # Find most experienced store
            most_orders = max(store_analyses, key=lambda s: s['metrics']['total_orders'])
            insights.append(f"{most_orders['name']} has the most experience with {most_orders['metrics']['total_orders']} total orders.")
            
            # Product variety insight
            most_products = max(store_analyses, key=lambda s: s['metrics']['product_count'])
            insights.append(f"{most_products['name']} offers the widest selection with {most_products['metrics']['product_count']} products.")
            
        except Exception as e:
            logger.error(f"Error generating store insights: {str(e)}")
            insights.append("Store comparison completed successfully.")
        
        return insights


class SentimentAnalysisService:
    """
    AI-powered sentiment analysis for product reviews and comments.
    """
    
    def __init__(self):
        # Simple keyword-based sentiment analysis (in production, use proper ML models)
        self.positive_words = [
            'excellent', 'amazing', 'great', 'good', 'love', 'perfect', 'awesome',
            'fantastic', 'wonderful', 'outstanding', 'superb', 'brilliant'
        ]
        self.negative_words = [
            'terrible', 'awful', 'bad', 'hate', 'horrible', 'disappointing',
            'poor', 'worst', 'useless', 'broken', 'defective', 'cheap'
        ]
    
    def analyze_sentiment(self, text: str) -> Dict:
        """
        Analyze sentiment of given text.
        """
        try:
            text_lower = text.lower()
            words = re.findall(r'\b\w+\b', text_lower)
            
            positive_count = sum(1 for word in words if word in self.positive_words)
            negative_count = sum(1 for word in words if word in self.negative_words)
            
            total_sentiment_words = positive_count + negative_count
            
            if total_sentiment_words == 0:
                sentiment = 'neutral'
                confidence = 0.5
            elif positive_count > negative_count:
                sentiment = 'positive'
                confidence = min(0.9, 0.5 + (positive_count - negative_count) / len(words))
            elif negative_count > positive_count:
                sentiment = 'negative'
                confidence = min(0.9, 0.5 + (negative_count - positive_count) / len(words))
            else:
                sentiment = 'neutral'
                confidence = 0.6
            
            # Extract key phrases (simplified)
            keywords = [word for word in words if word in self.positive_words + self.negative_words]
            
            return {
                'sentiment': sentiment,
                'confidence_score': round(confidence, 2),
                'emotion_scores': {
                    'positive': positive_count / len(words) if words else 0,
                    'negative': negative_count / len(words) if words else 0,
                    'neutral': 1 - (positive_count + negative_count) / len(words) if words else 1
                },
                'keywords': keywords[:5]  # Top 5 sentiment keywords
            }
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {str(e)}")
            return {
                'sentiment': 'neutral',
                'confidence_score': 0.5,
                'emotion_scores': {'positive': 0, 'negative': 0, 'neutral': 1},
                'keywords': []
            }
    
    def batch_analyze_sentiments(self, texts: List[str]) -> List[Dict]:
        """
        Analyze sentiment for multiple texts.
        """
        return [self.analyze_sentiment(text) for text in texts]
