"""
Django management command to verify the populated review data.
"""

from django.core.management.base import BaseCommand
from comments.models import Comment, CommentHelpfulness, AISentimentAnalysisResult
from products.models import Product, ProductImage
from auth_app.models import User


class Command(BaseCommand):
    """
    Django management command to verify populated data.
    """
    help = 'Verify the populated review and image data'

    def handle(self, *args, **options):
        """
        Main command execution logic.
        """
        self.stdout.write(
            self.style.SUCCESS('🔍 Verifying populated data...')
        )
        
        # Count data
        user_count = User.objects.count()
        product_count = Product.objects.count()
        image_count = ProductImage.objects.count()
        comment_count = Comment.objects.count()
        helpfulness_count = CommentHelpfulness.objects.count()
        sentiment_count = AISentimentAnalysisResult.objects.count()
        
        self.stdout.write("=== DATABASE VERIFICATION ===")
        self.stdout.write(f"👥 Users: {user_count}")
        self.stdout.write(f"📦 Products: {product_count}")
        self.stdout.write(f"🖼️  Product Images: {image_count}")
        self.stdout.write(f"📝 Comments/Reviews: {comment_count}")
        self.stdout.write(f"👍 Helpfulness Votes: {helpfulness_count}")
        self.stdout.write(f"🤖 Sentiment Analyses: {sentiment_count}")
        
        # Show sample reviews
        self.stdout.write("\n=== SAMPLE REVIEWS ===")
        reviews = Comment.objects.all()[:5]
        for review in reviews:
            self.stdout.write(
                f"Review by {review.user.username}: {review.rating}⭐ - {review.text[:50]}..."
            )
        
        # Show products with images
        products_with_images = Product.objects.filter(images__isnull=False).distinct()
        self.stdout.write(f"\n📸 Products with images: {products_with_images.count()}")
        for product in products_with_images[:3]:
            image_count = product.images.count()
            self.stdout.write(f"  {product.name}: {image_count} images")
        
        # Show rating distribution
        self.stdout.write(f"\n⭐ Rating Distribution:")
        for rating in range(1, 6):
            count = Comment.objects.filter(rating=rating).count()
            self.stdout.write(f"  {rating} stars: {count} reviews")
        
        # Show products with updated review stats
        products_with_reviews = Product.objects.filter(total_reviews__gt=0)[:5]
        self.stdout.write(f"\n📊 Products with updated review stats:")
        for product in products_with_reviews:
            self.stdout.write(
                f"  {product.name}: {product.total_reviews} reviews, "
                f"avg rating: {product.average_rating}"
            )
        
        self.stdout.write(
            self.style.SUCCESS('\n✅ Data verification completed!')
        )
