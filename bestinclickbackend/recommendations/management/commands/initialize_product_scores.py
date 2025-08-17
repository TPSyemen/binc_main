"""
Management command to initialize product interaction scores for existing products.
This creates ProductInteractionScore records for all existing products.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from products.models import Product
from recommendations.models import ProductInteractionScore
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Initialize product interaction scores for existing products'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing scores',
        )

    def handle(self, *args, **options):
        start_time = timezone.now()
        self.stdout.write(
            self.style.SUCCESS(f'Starting product score initialization at {start_time}')
        )

        try:
            # Get all active products
            products = Product.objects.filter(is_active=True)
            total_products = products.count()
            
            self.stdout.write(f'Found {total_products} active products to process')
            
            created_count = 0
            updated_count = 0
            
            for i, product in enumerate(products, 1):
                # Check if score already exists
                score_obj, created = ProductInteractionScore.objects.get_or_create(
                    product=product,
                    defaults={
                        'total_views': product.view_count,
                        'unique_views': max(1, product.view_count // 2),  # Estimate unique views
                        'avg_view_duration': 30.0,  # Default duration
                        'total_likes': 0,
                        'total_unlikes': 0,
                        'like_ratio': 0.0,
                        'total_cart_adds': 0,
                        'total_purchases': 0,
                        'conversion_rate': 0.0,
                        'avg_rating': product.average_rating,
                        'total_reviews': product.total_reviews,
                        'avg_sentiment': product.sentiment_rating,
                        'popularity_score': self._calculate_initial_popularity(product),
                        'quality_score': self._calculate_initial_quality(product),
                        'trending_score': 0.0,
                        'overall_score': self._calculate_initial_overall(product)
                    }
                )
                
                if created:
                    created_count += 1
                elif options['force']:
                    # Update existing score
                    score_obj.total_views = product.view_count
                    score_obj.unique_views = max(1, product.view_count // 2)
                    score_obj.avg_rating = product.average_rating
                    score_obj.total_reviews = product.total_reviews
                    score_obj.avg_sentiment = product.sentiment_rating
                    score_obj.popularity_score = self._calculate_initial_popularity(product)
                    score_obj.quality_score = self._calculate_initial_quality(product)
                    score_obj.overall_score = self._calculate_initial_overall(product)
                    score_obj.save()
                    updated_count += 1
                
                # Progress indicator
                if i % 100 == 0:
                    self.stdout.write(f'Processed {i}/{total_products} products...')
            
            # Summary
            end_time = timezone.now()
            duration = end_time - start_time
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Product score initialization completed!'
                    f'\n📊 Created: {created_count} new scores'
                    f'\n🔄 Updated: {updated_count} existing scores'
                    f'\n⏱ Duration: {duration.total_seconds():.2f} seconds'
                    f'\n🕐 Finished at: {end_time}'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error initializing product scores: {str(e)}')
            )
            logger.error(f'Error in initialize_product_scores command: {str(e)}')
            raise e

    def _calculate_initial_popularity(self, product):
        """Calculate initial popularity score based on existing data."""
        try:
            # Normalize metrics (0-1 scale)
            view_score = min(product.view_count / 1000.0, 1.0)  # Max at 1000 views
            
            # Weighted combination
            popularity = view_score * 0.8 + 0.2  # Base score of 0.2
            
            return min(popularity, 1.0)
        except:
            return 0.5

    def _calculate_initial_quality(self, product):
        """Calculate initial quality score based on existing data."""
        try:
            # Rating score (0-1 scale, 5-star rating)
            rating_score = product.average_rating / 5.0 if product.average_rating > 0 else 0.5
            
            # Sentiment score (convert -1 to 1 range to 0-1 range)
            sentiment_score = (product.sentiment_rating + 1) / 2 if product.sentiment_rating != 0 else 0.5
            
            # Review count factor (more reviews = more reliable)
            review_factor = min(product.total_reviews / 50.0, 1.0)  # Max factor at 50 reviews
            
            # Weighted combination
            quality = (
                rating_score * 0.5 +
                sentiment_score * 0.3 +
                review_factor * 0.2
            )
            
            return min(quality, 1.0)
        except:
            return 0.5

    def _calculate_initial_overall(self, product):
        """Calculate initial overall score."""
        try:
            popularity = self._calculate_initial_popularity(product)
            quality = self._calculate_initial_quality(product)
            
            # Weighted combination
            overall = popularity * 0.4 + quality * 0.6
            
            return min(overall, 1.0)
        except:
            return 0.5