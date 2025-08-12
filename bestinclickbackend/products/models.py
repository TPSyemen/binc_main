"""
Product-related models including categories, brands, stores, and products.
"""

from django.db import models
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from decimal import Decimal

User = get_user_model()


class Category(models.Model):
    """
    Product categories with hierarchical structure.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        indexes = [
            models.Index(fields=['parent', 'is_active']),
            models.Index(fields=['slug']),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def get_full_path(self):
        """Get full category path (e.g., 'Electronics > Smartphones')."""
        if self.parent:
            return f"{self.parent.get_full_path()} > {self.name}"
        return self.name


class Brand(models.Model):
    """
    Product brands.
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='brands/', null=True, blank=True)
    website = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'brands'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Store(models.Model):
    """
    Stores owned by store owners.
    """
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_stores',
        limit_choices_to={'role': 'store_owner'}
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True)
    
    # Contact information
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    address = models.TextField()
    
    # Store metrics (calculated fields)
    average_rating = models.FloatField(default=0.0)
    total_orders_count = models.PositiveIntegerField(default=0)
    customer_service_score = models.FloatField(
        default=0.0,
        help_text="AI-calculated customer service score for comparisons"
    )
    
    # Store settings
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    
    # Images
    logo = models.ImageField(upload_to='stores/logos/', null=True, blank=True)
    banner = models.ImageField(upload_to='stores/banners/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stores'
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['slug']),
            models.Index(fields=['is_active', 'is_verified']),
        ]
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.name}-{self.owner.username}")
        super().save(*args, **kwargs)


class Product(models.Model):
    """
    Products sold by stores.
    """
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='products')
    
    # Basic information
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, blank=True)
    description = models.TextField()
    sku = models.CharField(max_length=100, unique=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )
    
    # Inventory
    in_stock = models.BooleanField(default=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    
    # Images (stored as JSON array of URLs)
    image_urls = models.JSONField(default=list, blank=True)
    
    # Product metrics
    average_rating = models.FloatField(default=0.0)
    total_reviews = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)
    sentiment_rating = models.FloatField(default=0.0, help_text="Average sentiment score from reviews")
    interaction_score = models.FloatField(default=0.0, help_text="Calculated score based on reviews, brand value, and interactions")
    
    # Product attributes (flexible JSON field)
    attributes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Product specifications and attributes"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        indexes = [
            models.Index(fields=['store', 'is_active']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['brand', 'is_active']),
            models.Index(fields=['slug']),
            models.Index(fields=['price']),
            models.Index(fields=['average_rating']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.store.name}"
    
    def save(self, *args, **kwargs):
        # Always ensure slug is set before saving
        if not self.slug or self.slug.strip() == "":
            self.slug = slugify(f"{self.name}-{self.sku}")
        super().save(*args, **kwargs)
    
    def get_final_price(self):
        """Calculate final price after discount."""
        if self.discount_percentage > 0:
            discount_amount = self.price * (self.discount_percentage / 100)
            return self.price - discount_amount
        return self.price
    
    def get_discount_amount(self):
        """Get discount amount in currency."""
        if self.discount_percentage > 0:
            return self.price * (self.discount_percentage / 100)
        return Decimal('0.00')


class ProductImage(models.Model):
    """
    Additional product images.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'product_images'
        ordering = ['sort_order']
    
    def __str__(self):
        return f"Image for {self.product.name}"


class ProductLike(models.Model):
    """
    User likes for products.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='liked_products')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_likes'
        unique_together = ['user', 'product']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['product', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} likes {self.product.name}"


class ProductReview(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='product_reviews')
    rating = models.PositiveIntegerField(default=5, validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    sentiment = models.CharField(max_length=20, blank=True, null=True)
    is_owner = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'product_reviews'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='unique_user_product_review')
        ]

    def __str__(self):
        return f"Review by {self.user.username} on {self.product.name}"
