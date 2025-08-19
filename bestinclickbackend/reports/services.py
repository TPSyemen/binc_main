"""
Report generation services with AI-powered insights.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from django.db.models import Count, Avg, Sum, Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from products.models import Store, Product, Category
from ai_models.models import UserBehaviorLog
from dashboard.models import StoreAnalytics

User = get_user_model()
logger = logging.getLogger(__name__)


class ReportGenerationService:
    """
    Service for generating various types of reports with AI insights.
    """
    
    def generate_report(self, report_type: str, user: User, store_id: int = None,
                       date_from: datetime = None, date_to: datetime = None,
                       parameters: Dict = None) -> Dict[str, Any]:
        """
        Generate a report based on type and parameters.
        """
        try:
            parameters = parameters or {}
            
            if report_type == 'store_performance':
                return self._generate_store_performance_report(store_id, date_from, date_to, parameters)
            elif report_type == 'product_analysis':
                return self._generate_product_analysis_report(store_id, date_from, date_to, parameters)
            elif report_type == 'customer_insights':
                return self._generate_customer_insights_report(store_id, date_from, date_to, parameters)
            elif report_type == 'market_trends':
                return self._generate_market_trends_report(date_from, date_to, parameters)
            elif report_type == 'competitive_analysis':
                return self._generate_competitive_analysis_report(store_id, date_from, date_to, parameters)
            elif report_type == 'financial_summary':
                return self._generate_financial_summary_report(store_id, date_from, date_to, parameters)
            else:
                raise ValueError(f"Unknown report type: {report_type}")
                
        except Exception as e:
            logger.error(f"Error generating {report_type} report: {str(e)}")
            raise
    
    def _calculate_smart_revenue_estimate(self, product: Product, store: Store) -> float:
        """
        Calculate a smart revenue estimate for a product based on views and store performance.
        
        Args:
            product: The product to estimate revenue for
            store: The store the product belongs to
            
        Returns:
            Estimated revenue as a float
        """
        # Simple estimation based on view count and average conversion rate
        # This is a placeholder implementation
        view_count = product.view_count or 0
        price = product.get_final_price() or 0
        
        # Assume a base conversion rate of 2%
        base_conversion_rate = 0.02
        
        # Adjust based on product rating (higher rating = higher conversion)
        rating_factor = 1.0
        if product.average_rating:
            rating_factor = 0.8 + (product.average_rating / 5) * 0.4
            
        # Calculate estimated purchases
        estimated_purchases = view_count * base_conversion_rate * rating_factor
        
        # Calculate estimated revenue
        estimated_revenue = estimated_purchases * price
        
        return estimated_revenue
    
    def _generate_store_performance_report(self, store_id: int, date_from: datetime,
                                         date_to: datetime, parameters: Dict) -> Dict[str, Any]:
        """
        Generate store performance report with AI insights.
        """
        store = Store.objects.get(id=store_id)
        
        # Get analytics data
        analytics = StoreAnalytics.objects.filter(
            store=store,
            date__range=[date_from, date_to]
        )
        
        # Calculate metrics
        total_views = sum(a.total_views for a in analytics)
        # Removed total_revenue calculation as requested
        avg_conversion_rate = sum(a.conversion_rate for a in analytics) / len(analytics) if analytics else 0
        
        # Get product performance
        products = store.products.filter(is_active=True)
        top_products = products.order_by('-view_count', '-average_rating')[:5]
        
        # Get customer behavior
        behavior_data = UserBehaviorLog.objects.filter(
            product__store=store,
            timestamp__range=[date_from, date_to]
        )
        
        behavior_summary = behavior_data.values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        raw_data = {
            'store_info': {
                'id': store.id,
                'name': store.name,
                'average_rating': store.average_rating,
                'total_products': products.count()
            },
            'performance_metrics': {
                'total_views': total_views,
                # Remove price information as requested
                'avg_conversion_rate': round(avg_conversion_rate, 2),
                'period': f"{date_from} to {date_to}"
            },
            'top_products': [
                {
                    'name': p.name,
                    'views': p.view_count,
                    'rating': p.average_rating,
                    # Remove revenue estimate as requested
                }
                for p in top_products
            ],
            'customer_behavior': list(behavior_summary),
            'daily_analytics': [
                {
                    'date': str(a.date),
                    'views': a.total_views,
                    # Remove revenue information as requested
                    'conversion_rate': a.conversion_rate
                }
                for a in analytics
            ]
        }
        
        # Generate AI summary
        ai_summary = self._generate_store_performance_summary(raw_data)
        
        return {
            'raw_data': raw_data,
            'ai_summary': ai_summary,
            'visualizations': self._generate_performance_visualizations(raw_data)
        }
    
    def _generate_product_analysis_report(self, store_id: int, date_from: datetime,
                                        date_to: datetime, parameters: Dict) -> Dict[str, Any]:
        """
        Generate product analysis report.
        """
        store = Store.objects.get(id=store_id)
        products = store.products.filter(is_active=True)
        
        # Analyze product performance
        product_data = []
        for product in products:
            behavior = UserBehaviorLog.objects.filter(
                product=product,
                timestamp__range=[date_from, date_to]
            )
            
            views = behavior.filter(action_type='view').count()
            clicks = behavior.filter(action_type='click').count()
            cart_adds = behavior.filter(action_type='add_to_cart').count()
            
            # We still calculate revenue estimate for internal use but won't display it
            revenue_estimate = self._calculate_smart_revenue_estimate(product, store)
            
            product_data.append({
                'id': product.id,
                'name': product.name,
                'category': product.category.name,
                # Remove price information as requested
                'rating': product.average_rating,
                'views': views,
                'clicks': clicks,
                'cart_adds': cart_adds,
                'conversion_rate': (cart_adds / views * 100) if views > 0 else 0,
                # Remove revenue estimate as requested
                'engagement_score': self._calculate_engagement_score(views, clicks, cart_adds)
            })
        
        # Sort by performance
        product_data.sort(key=lambda x: x['conversion_rate'], reverse=True)
        
        raw_data = {
            'store_name': store.name,
            'analysis_period': f"{date_from} to {date_to}",
            'total_products': len(product_data),
            'products': product_data,
            'category_performance': self._analyze_category_performance(product_data),
            # Remove price analysis as requested
        }
        
        ai_summary = self._generate_product_analysis_summary(raw_data)
        
        return {
            'raw_data': raw_data,
            'ai_summary': ai_summary,
            'visualizations': self._generate_product_visualizations(raw_data)
        }
    
    def _generate_customer_insights_report(self, store_id: int, date_from: datetime,
                                         date_to: datetime, parameters: Dict) -> Dict[str, Any]:
        """
        Generate customer insights report.
        """
        store = Store.objects.get(id=store_id) if store_id else None
        
        # Get customer behavior data
        behavior_query = UserBehaviorLog.objects.filter(
            timestamp__range=[date_from, date_to]
        )
        
        if store:
            behavior_query = behavior_query.filter(product__store=store)
        
        # Analyze customer patterns
        user_activity = behavior_query.values('user').annotate(
            total_actions=Count('id'),
            unique_products=Count('product', distinct=True)
        ).order_by('-total_actions')[:20]
        
        # Popular times analysis
        # Use strftime for SQLite compatibility (EXTRACT is for PostgreSQL)
        # Double percent for Django ORM string formatting
        hourly_activity = behavior_query.extra(
            select={'hour': "strftime('%%H', timestamp)"}
        ).values('hour').annotate(
            activity_count=Count('id')
        ).order_by('hour')
        
        # Device/behavior analysis
        action_patterns = behavior_query.values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        raw_data = {
            'analysis_period': f"{date_from} to {date_to}",
            'store_name': store.name if store else 'All Stores',
            'total_interactions': behavior_query.count(),
            'unique_users': behavior_query.values('user').distinct().count(),
            'top_users': list(user_activity),
            'hourly_patterns': list(hourly_activity),
            'action_patterns': list(action_patterns),
            'customer_segments': self._identify_customer_segments(behavior_query)
        }
        
        ai_summary = self._generate_customer_insights_summary(raw_data)
        
        return {
            'raw_data': raw_data,
            'ai_summary': ai_summary,
            'visualizations': self._generate_customer_visualizations(raw_data)
        }
    
    def _generate_market_trends_report(self, date_from: datetime, date_to: datetime,
                                     parameters: Dict) -> Dict[str, Any]:
        """
        Generate market trends report.
        """
        # Analyze trending categories
        trending_categories = UserBehaviorLog.objects.filter(
            timestamp__range=[date_from, date_to],
            action_type='view'
        ).values(
            'product__category__name'
        ).annotate(
            view_count=Count('id')
        ).order_by('-view_count')[:10]
        
        # Analyze price trends
        price_trends = Product.objects.filter(
            is_active=True
        ).values('category__name').annotate(
            avg_price=Avg('price'),
            product_count=Count('id')
        ).order_by('-product_count')
        
        # Popular brands
        brand_popularity = UserBehaviorLog.objects.filter(
            timestamp__range=[date_from, date_to]
        ).values(
            'product__brand__name'
        ).annotate(
            interaction_count=Count('id')
        ).order_by('-interaction_count')[:10]
        
        raw_data = {
            'analysis_period': f"{date_from} to {date_to}",
            'trending_categories': list(trending_categories),
            'price_trends': list(price_trends),
            'popular_brands': list(brand_popularity),
            'market_insights': self._generate_market_insights()
        }
        
        ai_summary = self._generate_market_trends_summary(raw_data)
        
        return {
            'raw_data': raw_data,
            'ai_summary': ai_summary,
            'visualizations': self._generate_market_visualizations(raw_data)
        }
    
    def _generate_competitive_analysis_report(self, store_id: int, date_from: datetime,
                                            date_to: datetime, parameters: Dict) -> Dict[str, Any]:
        """
        Generate competitive analysis report.
        """
        target_store = Store.objects.get(id=store_id)
        
        # Find competitor stores in same categories
        target_categories = target_store.products.values_list('category', flat=True).distinct()
        competitor_stores = Store.objects.filter(
            products__category__in=target_categories,
            is_active=True,
            is_verified=True
        ).exclude(id=store_id).distinct()[:5]
        
        # Compare metrics
        comparison_data = []
        for store in [target_store] + list(competitor_stores):
            store_metrics = {
                'store_name': store.name,
                'is_target': store.id == store_id,
                'average_rating': store.average_rating,
                'total_products': store.products.filter(is_active=True).count(),
                'avg_price': store.products.filter(is_active=True).aggregate(
                    avg_price=Avg('price')
                )['avg_price'] or 0,
                'customer_service_score': store.customer_service_score
            }
            comparison_data.append(store_metrics)
        
        raw_data = {
            'target_store': target_store.name,
            'analysis_period': f"{date_from} to {date_to}",
            'competitor_comparison': comparison_data,
            'market_position': self._analyze_market_position(target_store, competitor_stores),
            'recommendations': self._generate_competitive_recommendations(target_store, comparison_data)
        }
        
        ai_summary = self._generate_competitive_analysis_summary(raw_data)
        
        return {
            'raw_data': raw_data,
            'ai_summary': ai_summary,
            'visualizations': self._generate_competitive_visualizations(raw_data)
        }
    
    def _generate_financial_summary_report(self, store_id: int, date_from: datetime,
                                         date_to: datetime, parameters: Dict) -> Dict[str, Any]:
        """
        Generate financial summary report.
        """
        store = Store.objects.get(id=store_id)
        
        # Get financial data from analytics
        analytics = StoreAnalytics.objects.filter(
            store=store,
            date__range=[date_from, date_to]
        )
        
        total_orders = sum(a.total_orders for a in analytics)
        
        # Monthly breakdown
        monthly_data = {}
        for analytics_item in analytics:
            month_key = analytics_item.date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    'orders': 0,
                    'days': 0
                }
            monthly_data[month_key]['orders'] += analytics_item.total_orders
            monthly_data[month_key]['days'] += 1
        
        raw_data = {
            'store_name': store.name,
            'period': f"{date_from} to {date_to}",
            'summary': {
                # Remove revenue information as requested
                'total_orders': total_orders,
                # Remove price information as requested
            },
            'monthly_breakdown': monthly_data,
            # Remove revenue products as requested
            'order_insights': self._generate_order_insights(total_orders)
        }
        
        ai_summary = self._generate_financial_summary(raw_data)
        
        return {
            'raw_data': raw_data,
            'ai_summary': ai_summary,
            'visualizations': self._generate_financial_visualizations(raw_data)
        }
        
    def _generate_order_insights(self, orders: int) -> List[str]:
        """Generate order insights without price information."""
        insights = []
        
        if orders > 50:
            insights.append("Healthy order volume shows good customer acquisition")
        elif orders > 20:
            insights.append("Moderate order volume indicates growing customer base")
        else:
            insights.append("Low order volume suggests need for improved marketing")
        
        return insights
    
    # Helper methods for generating AI summaries and insights
    
    def _generate_store_performance_summary(self, data: Dict) -> str:
        """Generate AI summary for store performance."""
        metrics = data['performance_metrics']
        store_name = data['store_info']['name']
        
        summary = f"Store Performance Analysis for {store_name}\n\n"
        summary += f"During the analysis period, {store_name} received {metrics['total_views']} total views. "
        summary += f"The average conversion rate was {metrics['avg_conversion_rate']:.2f}%.\n\n"
        
        if data['top_products']:
            top_product = data['top_products'][0]
            summary += f"The top-performing product was '{top_product['name']}' with {top_product['views']} views "
            summary += f"and a {top_product['rating']:.1f}-star rating.\n\n"
        
        # Add recommendations
        if metrics['avg_conversion_rate'] < 3:
            summary += "Recommendation: Focus on improving product descriptions to increase conversion rates."
        elif metrics['avg_conversion_rate'] > 7:
            summary += "Excellent performance! Consider expanding successful product lines."
        
        return summary
    
    def _generate_product_analysis_summary(self, data: Dict) -> str:
        """Generate AI summary for product analysis."""
        products = data['products']
        store_name = data['store_name']
        
        summary = f"Product Analysis for {store_name}\n\n"
        summary += f"Analyzed {len(products)} products during the specified period.\n\n"
        
        if products:
            best_product = products[0]
            summary += f"Top performer: '{best_product['name']}' with {best_product['conversion_rate']:.2f}% conversion rate.\n"
            
            avg_conversion = sum(p['conversion_rate'] for p in products) / len(products)
            summary += f"Average conversion rate across all products: {avg_conversion:.2f}%\n\n"
            
            # Category insights
            if 'category_performance' in data:
                summary += "Category Performance Insights:\n"
                for category, performance in data['category_performance'].items():
                    summary += f"- {category}: {performance['avg_conversion']:.2f}% avg conversion\n"
        
        return summary
    
    def _generate_customer_insights_summary(self, data: Dict) -> str:
        """Generate AI summary for customer insights."""
        summary = f"Customer Insights Analysis\n\n"
        summary += f"Total interactions: {data['total_interactions']}\n"
        summary += f"Unique users: {data['unique_users']}\n\n"
        
        if data['hourly_patterns']:
            peak_hour = max(data['hourly_patterns'], key=lambda x: x['activity_count'])
            summary += f"Peak activity hour: {peak_hour['hour']}:00 with {peak_hour['activity_count']} interactions\n\n"
        
        if data['action_patterns']:
            top_action = data['action_patterns'][0]
            summary += f"Most common user action: {top_action['action_type']} ({top_action['count']} occurrences)\n\n"
        
        summary += "Customer behavior insights reveal opportunities for targeted marketing and improved user experience."
        
        return summary
    
    def _generate_market_trends_summary(self, data: Dict) -> str:
        """Generate AI summary for market trends."""
        summary = f"Market Trends Analysis\n\n"
        
        if data['trending_categories']:
            top_category = data['trending_categories'][0]
            summary += f"Trending category: {top_category['product__category__name']} "
            summary += f"with {top_category['view_count']} views\n\n"
        
        if data['popular_brands']:
            top_brand = data['popular_brands'][0]
            summary += f"Most popular brand: {top_brand['product__brand__name']} "
            summary += f"with {top_brand['interaction_count']} interactions\n\n"
        
        summary += "Market analysis shows evolving consumer preferences and emerging opportunities."
        
        return summary
    
    def _generate_competitive_analysis_summary(self, data: Dict) -> str:
        """Generate AI summary for competitive analysis."""
        target_store = data['target_store']
        comparison = data['competitor_comparison']
        
        summary = f"Competitive Analysis for {target_store}\n\n"
        
        target_data = next(c for c in comparison if c['is_target'])
        competitors = [c for c in comparison if not c['is_target']]
        
        avg_competitor_rating = sum(c['average_rating'] for c in competitors) / len(competitors) if competitors else 0
        
        if target_data['average_rating'] > avg_competitor_rating:
            summary += f"Competitive advantage: Your store rating ({target_data['average_rating']:.1f}) "
            summary += f"exceeds competitor average ({avg_competitor_rating:.1f})\n\n"
        else:
            summary += f"Improvement opportunity: Competitor average rating ({avg_competitor_rating:.1f}) "
            summary += f"is higher than your store ({target_data['average_rating']:.1f})\n\n"
        
        summary += "Detailed competitive insights and recommendations are provided in the full report."
        
        return summary
    
    def _generate_financial_summary(self, data: Dict) -> str:
        """Generate AI summary for financial report."""
        summary_data = data['summary']
        store_name = data['store_name']
        
        summary = f"Order Summary for {store_name}\n\n"
        summary += f"Total Orders: {summary_data['total_orders']}\n\n"
        
        # Add insights based on order volume
        if summary_data['total_orders'] > 100:
            summary += "Strong order volume indicates effective marketing and customer satisfaction."
        elif summary_data['total_orders'] > 50:
            summary += "Good order volume shows steady customer engagement."
        else:
            summary += "Consider implementing strategies to increase order volume."
        
        return summary
    
    # Helper methods for data analysis
    
    def _analyze_category_performance(self, product_data: List[Dict]) -> Dict:
        """Analyze performance by category."""
        category_stats = {}
        for product in product_data:
            category = product['category']
            if category not in category_stats:
                category_stats[category] = {
                    'products': 0,
                    'total_conversion': 0,
                    'total_views': 0
                }
            category_stats[category]['products'] += 1
            category_stats[category]['total_conversion'] += product['conversion_rate']
            category_stats[category]['total_views'] += product['views']
        
        # Calculate averages
        for category, stats in category_stats.items():
            stats['avg_conversion'] = stats['total_conversion'] / stats['products']
            stats['avg_views'] = stats['total_views'] / stats['products']
        
        return category_stats
    
    def _analyze_price_performance(self, product_data: List[Dict]) -> Dict:
        """Analyze performance by price range."""
        price_ranges = {
            'under_50': {'products': [], 'avg_conversion': 0},
            '50_100': {'products': [], 'avg_conversion': 0},
            '100_200': {'products': [], 'avg_conversion': 0},
            'over_200': {'products': [], 'avg_conversion': 0}
        }
        
        for product in product_data:
            price = product['price']
            if price < 50:
                price_ranges['under_50']['products'].append(product)
            elif price < 100:
                price_ranges['50_100']['products'].append(product)
            elif price < 200:
                price_ranges['100_200']['products'].append(product)
            else:
                price_ranges['over_200']['products'].append(product)
        
        # Calculate averages
        for range_name, range_data in price_ranges.items():
            if range_data['products']:
                range_data['avg_conversion'] = sum(
                    p['conversion_rate'] for p in range_data['products']
                ) / len(range_data['products'])
        
        return price_ranges
    
    def _identify_customer_segments(self, behavior_query) -> List[Dict]:
        """Identify customer segments based on behavior."""
        # Simplified customer segmentation
        segments = [
            {
                'name': 'Browsers',
                'description': 'Users who view many products but rarely add to cart',
                'characteristics': ['High view count', 'Low cart additions']
            },
            {
                'name': 'Converters',
                'description': 'Users who frequently add items to cart',
                'characteristics': ['High cart addition rate', 'Purchase intent']
            },
            {
                'name': 'Researchers',
                'description': 'Users who spend time comparing products',
                'characteristics': ['Product comparisons', 'Detailed views']
            }
        ]
        
        return segments
    
    def _generate_market_insights(self) -> List[str]:
        """Generate general market insights."""
        return [
            "E-commerce growth continues with mobile shopping increasing",
            "Customers prioritize product reviews and ratings",
            "Fast shipping and easy returns are key differentiators",
            "Personalized recommendations drive higher engagement"
        ]
    
    def _analyze_market_position(self, target_store: Store, competitors: List[Store]) -> Dict:
        """Analyze market position relative to competitors."""
        return {
            'rating_rank': 1,  # Simplified
            'product_variety_rank': 2,
            'price_competitiveness': 'moderate',
            'unique_strengths': ['Customer service', 'Product quality'],
            'improvement_areas': ['Marketing reach', 'Product diversity']
        }
    
    def _generate_competitive_recommendations(self, target_store: Store, comparison_data: List[Dict]) -> List[str]:
        """Generate competitive recommendations."""
        return [
            "Focus on improving customer service scores",
            "Expand product catalog in trending categories",
            "Implement competitive pricing strategies",
            "Enhance marketing and brand visibility"
        ]
    
    def _get_top_revenue_products(self, store: Store) -> List[Dict]:
        """Get top revenue-generating products."""
        products = store.products.filter(is_active=True).order_by('-view_count')[:5]
        return [
            {
                'name': p.name,
                'estimated_revenue': float(p.get_final_price() * 10),  # Simplified
                'price': float(p.get_final_price()),
                'views': p.view_count
            }
            for p in products
        ]
    
    def _generate_financial_insights(self, revenue: float, orders: int, aov: float) -> List[str]:
        """Generate financial insights."""
        insights = []
        
        if aov > 100:
            insights.append("Strong average order value indicates effective product bundling")
        if orders > 50:
            insights.append("Healthy order volume shows good customer acquisition")
        if revenue > 1000:
            insights.append("Revenue performance exceeds small business benchmarks")
        
        return insights
    
    # Visualization data generators (simplified)
    
    def _generate_performance_visualizations(self, data: Dict) -> Dict:
        """Generate visualization data for performance report."""
        # Create a version of daily analytics without price information
        daily_analytics_for_viz = []
        for day in data.get('daily_analytics', []):
            day_viz = {
                'date': day['date'],
                'views': day['views'],
                'conversion_rate': day['conversion_rate']
            }
            daily_analytics_for_viz.append(day_viz)
            
        # Create a version of top products without price information
        top_products_for_viz = []
        for product in data.get('top_products', []):
            product_viz = {
                'name': product['name'],
                'views': product['views'],
                'rating': product['rating']
            }
            top_products_for_viz.append(product_viz)
            
        return {
            'views_chart': {
                'type': 'line',
                'data': daily_analytics_for_viz
            },
            'product_performance': {
                'type': 'bar',
                'data': top_products_for_viz
            }
        }
    
    def _generate_product_visualizations(self, data: Dict) -> Dict:
        """Generate visualization data for product analysis."""
        # Create a version of products data without price information
        products_for_viz = []
        for product in data.get('products', [])[:10]:
            product_viz = {
                'name': product['name'],
                'views': product['views'],
                'conversion_rate': product['conversion_rate'],
                'engagement_score': product['engagement_score']
            }
            products_for_viz.append(product_viz)
            
        return {
            'conversion_rates': {
                'type': 'bar',
                'data': products_for_viz
            },
            'category_performance': {
                'type': 'pie',
                'data': data.get('category_performance', {})
            }
        }
    
    def _generate_customer_visualizations(self, data: Dict) -> Dict:
        """Generate visualization data for customer insights."""
        return {
            'hourly_activity': {
                'type': 'line',
                'data': data.get('hourly_patterns', [])
            },
            'action_distribution': {
                'type': 'pie',
                'data': data.get('action_patterns', [])
            }
        }
    
    def _generate_market_visualizations(self, data: Dict) -> Dict:
        """Generate visualization data for market trends."""
        return {
            'trending_categories': {
                'type': 'bar',
                'data': data.get('trending_categories', [])
            },
            'brand_popularity': {
                'type': 'horizontal_bar',
                'data': data.get('popular_brands', [])
            }
        }
    
    def _generate_competitive_visualizations(self, data: Dict) -> Dict:
        """Generate visualization data for competitive analysis."""
        return {
            'competitor_comparison': {
                'type': 'radar',
                'data': data.get('competitor_comparison', [])
            }
        }
    
    def _generate_financial_visualizations(self, data: Dict) -> Dict:
        """Generate visualization data for financial report."""
        return {
            'monthly_orders': {
                'type': 'bar',
                'data': data.get('monthly_breakdown', {})
            },
            'order_insights': {
                'type': 'text',
                'data': data.get('order_insights', [])
            }
        }
        
    def _calculate_engagement_score(self, views: int, clicks: int, cart_adds: int) -> float:
        """
        Calculate an engagement score based on user interactions.
        
        Args:
            views: Number of product views
            clicks: Number of product clicks
            cart_adds: Number of times product was added to cart
            
        Returns:
            Engagement score as a float
        """
        # Simple weighted scoring
        # Views are worth 1 point, clicks 3 points, cart adds 10 points
        if views == 0:
            return 0
            
        base_score = views + (clicks * 3) + (cart_adds * 10)
        
        # Normalize by views to get a per-view engagement score
        normalized_score = base_score / views
        
        # Scale to a 0-100 range for easier interpretation
        # Assuming a "perfect" score would be if every view resulted in a cart add
        # which would give a normalized score of 11 (1 + 0 + 10)
        scaled_score = min(100, normalized_score * 9)
        
        return round(scaled_score, 2)
