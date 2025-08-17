"""
Management command to update product interaction scores and user similarities.
Run this periodically (e.g., hourly or daily) to keep recommendations fresh.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from ai_models.interaction_analyzer import InteractionAnalyzer
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Update product interaction scores and user similarities for recommendations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--products',
            nargs='+',
            type=int,
            help='Specific product IDs to update (default: all products)',
        )
        parser.add_argument(
            '--users',
            nargs='+',
            type=int,
            help='Specific user IDs to calculate similarities for (default: active users)',
        )
        parser.add_argument(
            '--skip-similarities',
            action='store_true',
            help='Skip user similarity calculations (faster)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Batch size for processing (default: 100)',
        )

    def handle(self, *args, **options):
        start_time = timezone.now()
        self.stdout.write(
            self.style.SUCCESS(f'Starting recommendation score update at {start_time}')
        )

        analyzer = InteractionAnalyzer()

        try:
            # Update product scores
            self.stdout.write('Updating product interaction scores...')
            product_ids = options.get('products')
            analyzer.update_product_scores(product_ids=product_ids)
            self.stdout.write(
                self.style.SUCCESS('✓ Product scores updated successfully')
            )

            # Calculate user similarities (if not skipped)
            if not options.get('skip_similarities'):
                self.stdout.write('Calculating user similarities...')
                user_ids = options.get('users')
                analyzer.calculate_user_similarities(user_ids=user_ids)
                self.stdout.write(
                    self.style.SUCCESS('✓ User similarities calculated successfully')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('⚠ Skipped user similarity calculations')
                )

            # Summary
            end_time = timezone.now()
            duration = end_time - start_time
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Recommendation update completed successfully!'
                    f'\n⏱ Duration: {duration.total_seconds():.2f} seconds'
                    f'\n🕐 Finished at: {end_time}'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error updating recommendations: {str(e)}')
            )
            logger.error(f'Error in update_recommendation_scores command: {str(e)}')
            raise e