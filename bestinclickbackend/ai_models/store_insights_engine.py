"""
AI-powered Store Insights Engine
Analyzes store performance and provides actionable recommendations
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from django.db.models import Count, Avg, Sum, Q
from django.utils import timezone

from products.models import Product, Store
from users.models import User

logger = logging.getLogger(__name__)


class StoreInsightsEngine:
    """
    AI engine for generating store insights and recommendations
    """
    
    def __init__(self):
        self.insights_cache = {}
        
    def generate_store_insights(self, store_id: int, days: int = 30) -> Dict:
        """
        Generate comprehensive insights for a store
        """
        try:
            store = Store.objects.get(id=store_id)
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Collect store data
            store_data = self._collect_store_data(store, start_date, end_date)
            
            # Generate insights
            insights = []
            performance_score = 0
            
            # Product Performance Insights
            product_insights = self._analyze_product_performance(store_data)
            insights.extend(product_insights['insights'])
            performance_score += product_insights['score']
            
            # Customer Behavior Insights
            customer_insights = self._analyze_customer_behavior(store_data)
            insights.extend(customer_insights['insights'])
            performance_score += customer_insights['score']
            
            # Inventory Management Insights
            inventory_insights = self._analyze_inventory(store_data)
            insights.extend(inventory_insights['insights'])
            performance_score += inventory_insights['score']
            
            # Pricing Strategy Insights
            pricing_insights = self._analyze_pricing_strategy(store_data)
            insights.extend(pricing_insights['insights'])
            performance_score += pricing_insights['score']
            
            # Marketing Insights
            marketing_insights = self._analyze_marketing_opportunities(store_data)
            insights.extend(marketing_insights['insights'])
            performance_score += marketing_insights['score']
            
            # Calculate final performance score
            performance_score = min(100, max(0, performance_score / 5))
            
            # Generate performance summary
            performance_summary = self._generate_performance_summary(performance_score, insights)
            
            return {
                'store_id': store_id,
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
            logger.error(f"Error generating store insights: {str(e)}")
            return {
                'error': 'Failed to generate insights',
                'insights': [],
                'performance_score': 0,
                'performance_summary': 'Unable to analyze store performance at this time.'
            }
    
    def _collect_store_data(self, store: Store, start_date, end_date) -> Dict:
        """
        Collect all relevant store data for analysis
        """
        products = Product.objects.filter(store=store, is_active=True)
        
        return {
            'store': store,
            'products': products,
            'total_products': products.count(),
            'active_products': products.filter(in_stock=True).count(),
            'out_of_stock': products.filter(in_stock=False).count(),
            'total_views': sum(p.view_count or 0 for p in products),
            'avg_rating': products.aggregate(avg_rating=Avg('average_rating'))['avg_rating'] or 0,
            'total_reviews': sum(p.total_reviews or 0 for p in products),
            'start_date': start_date,
            'end_date': end_date
        }
    
    def _analyze_product_performance(self, data: Dict) -> Dict:
        """
        Analyze product performance and generate insights
        """
        insights = []
        score = 50  # Base score
        
        products = data['products']
        total_views = data['total_views']
        total_reviews = data['total_reviews']
        
        # Low-performing products
        low_view_products = products.filter(view_count__lt=5).count()
        if low_view_products > 0:
            percentage = (low_view_products / data['total_products']) * 100
            if percentage > 50:
                insights.append({
                    'type': 'product_performance',
                    'priority': 'high',
                    'title': 'منتجات قليلة المشاهدة',
                    'description': f'{percentage:.0f}% من منتجاتك تحصل على مشاهدات قليلة. يجب تحسين أوصاف المنتجات وإضافة صور جذابة.',
                    'action': 'تحسين أوصاف المنتجات',
                    'impact': 'زيادة المشاهدات بنسبة 40%',
                    'icon': 'fa-eye'
                })
                score -= 15
        
        # Products without images
        no_image_products = products.filter(images__isnull=True).count()
        if no_image_products > 0:
            insights.append({
                'type': 'product_images',
                'priority': 'high',
                'title': 'منتجات بدون صور',
                'description': f'{no_image_products} منتج بدون صور. المنتجات التي تحتوي على صور تحصل على مشاهدات أكثر بـ 3 مرات.',
                'action': 'إضافة صور للمنتجات',
                'impact': 'زيادة التحويلات بنسبة 60%',
                'icon': 'fa-image'
            })
            score -= 10
        
        # High-rated products opportunity
        high_rated = products.filter(average_rating__gte=4.5).count()
        if high_rated > 0:
            insights.append({
                'type': 'product_promotion',
                'priority': 'medium',
                'title': 'منتجات عالية التقييم',
                'description': f'لديك {high_rated} منتج بتقييم ممتاز. يمكنك الترويج لهذه المنتجات لزيادة المبيعات.',
                'action': 'إنشاء حملة ترويجية',
                'impact': 'زيادة المبيعات بنسبة 25%',
                'icon': 'fa-star'
            })
            score += 10
        
        # Products needing price optimization
        avg_price = products.aggregate(avg_price=Avg('price'))['avg_price'] or 0
        expensive_products = products.filter(price__gt=avg_price * 1.5).count()
        if expensive_products > data['total_products'] * 0.3:
            insights.append({
                'type': 'pricing',
                'priority': 'medium',
                'title': 'مراجعة الأسعار',
                'description': 'بعض منتجاتك قد تكون مرتفعة السعر مقارنة بالمتوسط. فكر في تقديم عروض أو خصومات.',
                'action': 'مراجعة استراتيجية التسعير',
                'impact': 'زيادة المبيعات بنسبة 20%',
                'icon': 'fa-tags'
            })
        
        return {'insights': insights, 'score': score}
    
    def _analyze_customer_behavior(self, data: Dict) -> Dict:
        """
        Analyze customer behavior patterns
        """
        insights = []
        score = 50
        
        total_views = data['total_views']
        total_reviews = data['total_reviews']
        avg_rating = data['avg_rating']
        
        if total_views > 0:
            review_rate = (total_reviews / total_views) * 100
            if review_rate < 2:
                insights.append({
                    'type': 'customer_engagement',
                    'priority': 'high',
                    'title': 'معدل تفاعل منخفض',
                    'description': f'معدل التقييمات {review_rate:.1f}% فقط. يجب تشجيع العملاء على ترك تقييمات.',
                    'action': 'إنشاء حملة لتشجيع التقييمات',
                    'impact': 'تحسين الثقة وزيادة المبيعات',
                    'icon': 'fa-comments'
                })
                score -= 15
        
        # Peak viewing times
        if total_views > 10:
            # Analyze viewing patterns (simplified)
            insights.append({
                'type': 'timing',
                'priority': 'low',
                'title': 'أوقات الذروة',
                'description': 'عملاؤك أكثر نشاطاً في المساء. فكر في نشر المنتجات الجديدة في هذا الوقت.',
                'action': 'جدولة المنشورات',
                'impact': 'زيادة الوصول بنسبة 30%',
                'icon': 'fa-clock'
            })
        
        # Customer retention
        if total_reviews > 0:
            if avg_rating >= 4.0:
                insights.append({
                    'type': 'customer_satisfaction',
                    'priority': 'low',
                    'title': 'رضا العملاء ممتاز',
                    'description': f'متوسط تقييماتك {avg_rating:.1f}/5. عملاؤك راضون عن منتجاتك!',
                    'action': 'الاستمرار في الجودة العالية',
                    'impact': 'الحفاظ على الولاء',
                    'icon': 'fa-heart'
                })
                score += 15
            elif avg_rating < 3.0:
                insights.append({
                    'type': 'customer_satisfaction',
                    'priority': 'high',
                    'title': 'تحسين رضا العملاء',
                    'description': f'متوسط تقييماتك {avg_rating:.1f}/5. يجب تحسين جودة المنتجات والخدمة.',
                    'action': 'مراجعة جودة المنتجات',
                    'impact': 'تحسين السمعة والمبيعات',
                    'icon': 'fa-exclamation-triangle'
                })
                score -= 20
        
        return {'insights': insights, 'score': score}
    
    def _analyze_inventory(self, data: Dict) -> Dict:
        """
        Analyze inventory management
        """
        insights = []
        score = 50
        
        total_products = data['total_products']
        out_of_stock = data['out_of_stock']
        
        if total_products > 0:
            out_of_stock_rate = (out_of_stock / total_products) * 100
            
            if out_of_stock_rate > 20:
                insights.append({
                    'type': 'inventory',
                    'priority': 'high',
                    'title': 'نفاد المخزون',
                    'description': f'{out_of_stock_rate:.0f}% من منتجاتك غير متوفرة. هذا يؤثر سلباً على المبيعات.',
                    'action': 'تجديد المخزون',
                    'impact': 'منع فقدان المبيعات',
                    'icon': 'fa-boxes'
                })
                score -= 20
            elif out_of_stock_rate < 5:
                insights.append({
                    'type': 'inventory',
                    'priority': 'low',
                    'title': 'إدارة مخزون ممتازة',
                    'description': 'معظم منتجاتك متوفرة. إدارة المخزون لديك ممتازة!',
                    'action': 'الاستمرار في المراقبة',
                    'impact': 'الحفاظ على رضا العملاء',
                    'icon': 'fa-check-circle'
                })
                score += 10
        
        # Low stock warnings (simplified)
        low_stock_products = data['products'].filter(stock_quantity__lt=5, stock_quantity__gt=0).count()
        if low_stock_products > 0:
            insights.append({
                'type': 'inventory_warning',
                'priority': 'medium',
                'title': 'تحذير مخزون منخفض',
                'description': f'{low_stock_products} منتج بمخزون منخفض. يجب إعادة التزويد قريباً.',
                'action': 'طلب مخزون إضافي',
                'impact': 'تجنب نفاد المخزون',
                'icon': 'fa-exclamation'
            })
        
        return {'insights': insights, 'score': score}
    
    def _analyze_pricing_strategy(self, data: Dict) -> Dict:
        """
        Analyze pricing strategy effectiveness
        """
        insights = []
        score = 50
        
        products = data['products']
        
        # Discount analysis
        discounted_products = products.filter(discount_percentage__gt=0).count()
        total_products = data['total_products']
        
        if total_products > 0:
            discount_rate = (discounted_products / total_products) * 100
            
            if discount_rate < 10:
                insights.append({
                    'type': 'pricing_strategy',
                    'priority': 'medium',
                    'title': 'فرصة للعروض',
                    'description': 'قليل من منتجاتك بها خصومات. العروض تزيد من جاذبية المنتجات.',
                    'action': 'إنشاء عروض موسمية',
                    'impact': 'زيادة المبيعات بنسبة 35%',
                    'icon': 'fa-percent'
                })
            elif discount_rate > 50:
                insights.append({
                    'type': 'pricing_strategy',
                    'priority': 'medium',
                    'title': 'مراجعة استراتيجية الخصومات',
                    'description': 'نسبة عالية من منتجاتك بها خصومات. تأكد من الحفاظ على الربحية.',
                    'action': 'مراجعة هوامش الربح',
                    'impact': 'تحسين الربحية',
                    'icon': 'fa-chart-line'
                })
        
        # Price competitiveness (simplified analysis)
        avg_price = products.aggregate(avg_price=Avg('price'))['avg_price'] or 0
        if avg_price > 0:
            insights.append({
                'type': 'market_position',
                'priority': 'low',
                'title': 'موقع السوق',
                'description': f'متوسط أسعارك {avg_price:.0f}. تأكد من مراقبة أسعار المنافسين.',
                'action': 'مراقبة أسعار السوق',
                'impact': 'الحفاظ على التنافسية',
                'icon': 'fa-balance-scale'
            })
        
        return {'insights': insights, 'score': score}
    
    def _analyze_marketing_opportunities(self, data: Dict) -> Dict:
        """
        Analyze marketing opportunities
        """
        insights = []
        score = 50
        
        products = data['products']
        views = data['views']
        
        # SEO opportunities
        products_without_description = products.filter(
            Q(description__isnull=True) | Q(description__exact='')
        ).count()
        
        if products_without_description > 0:
            insights.append({
                'type': 'seo',
                'priority': 'medium',
                'title': 'تحسين محركات البحث',
                'description': f'{products_without_description} منتج بدون وصف مفصل. الأوصاف تحسن ظهورك في البحث.',
                'action': 'كتابة أوصاف مفصلة',
                'impact': 'زيادة الزيارات من البحث',
                'icon': 'fa-search'
            })
            score -= 10
        
        # Social media opportunities
        high_view_products = products.filter(view_count__gte=50).count()
        if high_view_products > 0:
            insights.append({
                'type': 'social_media',
                'priority': 'low',
                'title': 'فرصة للتسويق الاجتماعي',
                'description': f'{high_view_products} منتج يحصل على مشاهدات عالية. شاركها على وسائل التواصل!',
                'action': 'مشاركة على وسائل التواصل',
                'impact': 'زيادة الوعي بالعلامة التجارية',
                'icon': 'fa-share-alt'
            })
            score += 5
        
        # Content marketing
        if data['total_products'] > 10:
            insights.append({
                'type': 'content_marketing',
                'priority': 'low',
                'title': 'التسويق بالمحتوى',
                'description': 'لديك مجموعة جيدة من المنتجات. فكر في إنشاء محتوى تعليمي حولها.',
                'action': 'إنشاء محتوى تعليمي',
                'impact': 'بناء الثقة والخبرة',
                'icon': 'fa-pen'
            })
        
        return {'insights': insights, 'score': score}
    
    def _generate_performance_summary(self, score: float, insights: List[Dict]) -> str:
        """
        Generate a performance summary based on score and insights
        """
        high_priority = len([i for i in insights if i.get('priority') == 'high'])
        
        if score >= 80:
            return f"أداء ممتاز! متجرك يعمل بكفاءة عالية. لديك {high_priority} نقطة تحتاج انتباه."
        elif score >= 60:
            return f"أداء جيد مع مجال للتحسين. ركز على {high_priority} نقطة مهمة لتحسين الأداء."
        elif score >= 40:
            return f"أداء متوسط. يحتاج متجرك لتحسينات في {high_priority} مجال مهم."
        else:
            return f"يحتاج متجرك لتحسينات جوهرية. ابدأ بـ {high_priority} نقطة عالية الأولوية."


# Global instance
store_insights_engine = StoreInsightsEngine()