#!/usr/bin/env python
"""
Quick script to verify the populated data.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'best_on_click.settings')
django.setup()

from comments.models import Comment, CommentHelpfulness, AISentimentAnalysisResult
from products.models import Product, ProductImage
from auth_app.models import User

def verify_data():
    """Verify the populated data."""
    
    print("=== DATABASE VERIFICATION ===")
    print(f"👥 Users: {User.objects.count()}")
    print(f"📦 Products: {Product.objects.count()}")
    print(f"🖼️  Product Images: {ProductImage.objects.count()}")
    print(f"📝 Comments/Reviews: {Comment.objects.count()}")
    print(f"👍 Helpfulness Votes: {CommentHelpfulness.objects.count()}")
    print(f"🤖 Sentiment Analyses: {AISentimentAnalysisResult.objects.count()}")
    
    print("\n=== SAMPLE DATA ===")
    
    # Show some sample reviews
    reviews = Comment.objects.all()[:5]
    for review in reviews:
        print(f"Review by {review.user.username}: {review.rating}⭐ - {review.text[:50]}...")
    
    # Show products with images
    products_with_images = Product.objects.filter(images__isnull=False).distinct()[:3]
    print(f"\n📸 Products with images: {products_with_images.count()}")
    for product in products_with_images:
        image_count = product.images.count()
        print(f"  {product.name}: {image_count} images")
    
    # Show rating distribution
    print(f"\n⭐ Rating Distribution:")
    for rating in range(1, 6):
        count = Comment.objects.filter(rating=rating).count()
        print(f"  {rating} stars: {count} reviews")
    
    print("\n✅ Data verification completed!")

if __name__ == "__main__":
    verify_data()
