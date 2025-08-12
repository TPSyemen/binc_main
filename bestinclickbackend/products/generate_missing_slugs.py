# Script to auto-generate slug for products missing slug
# Usage: python manage.py shell < generate_missing_slugs.py

from bestinclickbackend.products.models import Product
from django.utils.text import slugify

count = 0
for product in Product.objects.filter(slug__isnull=True) | Product.objects.filter(slug=''):
    # Generate slug from name and id for uniqueness
    base_slug = slugify(product.name) if product.name else f'product-{product.id}'
    unique_slug = base_slug
    i = 1
    # Ensure slug is unique
    while Product.objects.filter(slug=unique_slug).exclude(pk=product.pk).exists():
        unique_slug = f"{base_slug}-{i}"
        i += 1
    product.slug = unique_slug
    product.save()
    count += 1
print(f"Updated {count} products with missing slug.")
