"""
Serializers for products app.
"""

from rest_framework import serializers
from .models import Category, Brand, Store, Product, ProductImage, ProductLike, ProductReview


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for product categories.
    """
    children = serializers.SerializerMethodField()
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 'parent',
            'image', 'is_active', 'sort_order', 'children', 'full_path'
        ]
    
    def get_children(self, obj):
        if obj.children.exists():
            return CategorySerializer(obj.children.filter(is_active=True), many=True).data
        return []


class BrandSerializer(serializers.ModelSerializer):
    """
    Serializer for product brands.
    """
    
    class Meta:
        model = Brand
        fields = [
            'id', 'name', 'slug', 'description', 'logo',
            'website', 'is_active'
        ]


class StoreSerializer(serializers.ModelSerializer):
    """
    Serializer for stores.
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Store
        fields = [
            'id', 'name', 'slug', 'description', 'email', 'phone',
            'address', 'average_rating', 'total_orders_count',
            'customer_service_score', 'is_active', 'is_verified',
            'logo', 'banner', 'owner_name', 'product_count'
        ]
    
    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class StoreUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating store information by store owners.
    """
    
    class Meta:
        model = Store
        fields = [
            'name', 'description', 'email', 'phone', 'address', 
            'logo', 'banner'
        ]
    
    def validate_name(self, value):
        """
        Validate that store name is not empty and unique for this owner.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("اسم المتجر مطلوب")
        
        instance = getattr(self, 'instance', None)
        if instance:
            # Check if another store with same name exists for different owners
            existing_store = Store.objects.filter(
                name__iexact=value.strip()
            ).exclude(pk=instance.pk).first()
            
            if existing_store:
                raise serializers.ValidationError("يوجد متجر آخر بنفس الاسم")
        
        return value.strip()
    
    def validate_email(self, value):
        """
        Validate email format and uniqueness.
        Allow email to be optional for partial updates.
        """
        # Only validate if email is provided in the request data
        if self.partial and 'email' not in self.initial_data:
            return self.instance.email # Keep the existing email if not provided in partial update

        if not value:
            raise serializers.ValidationError("البريد الإلكتروني مطلوب")
        
        instance = getattr(self, 'instance', None)
        if instance:
            # Check if another store with same email exists
            existing_store = Store.objects.filter(
                email__iexact=value
            ).exclude(pk=instance.pk).first()
            
            if existing_store:
                raise serializers.ValidationError("يوجد متجر آخر بنفس البريد الإلكتروني")
        
        return value
    
    def validate_phone(self, value):
        """
        Validate phone number.
        """
        if not value:
            raise serializers.ValidationError("رقم الهاتف مطلوب")
        
        # Basic phone validation
        import re
        phone_pattern = r'^[\+]?[1-9][\d]{0,15}$'
        if not re.match(phone_pattern, value.replace(' ', '').replace('-', '')):
            raise serializers.ValidationError("رقم الهاتف غير صحيح")
        
        return value
    
    def validate_address(self, value):
        """
        Validate address is not empty.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("العنوان مطلوب")
        
        return value.strip()


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for product images.
    """
    
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'sort_order']


class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for products.
    """
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    store = StoreSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    final_price = serializers.DecimalField(
        source='get_final_price',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    discount_amount = serializers.DecimalField(
        source='get_discount_amount',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    is_liked = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()

    def get_slug(self, obj):
        # إذا لم يوجد سلق، قم بتوليده من الاسم والمعرف
        if obj.slug:
            return obj.slug
        from django.utils.text import slugify
        base_slug = slugify(obj.name) if obj.name else f'product-{obj.id}'
        unique_slug = base_slug
        i = 1
        from .models import Product
        while Product.objects.filter(slug=unique_slug).exclude(pk=obj.pk).exists():
            unique_slug = f"{base_slug}-{i}"
            i += 1
        # احفظ السلق في قاعدة البيانات
        obj.slug = unique_slug
        obj.save()
        return unique_slug
    
    class Meta:
        model = Product
        fields = [
            'id', 'slug', 'name', 'description', 'sku', 'price',
            'discount_percentage', 'final_price', 'discount_amount',
            'in_stock', 'stock_quantity', 'image_urls', 'average_rating',
            'total_reviews', 'view_count', 'attributes', 'is_active',
            'is_featured', 'created_at', 'updated_at', 'category',
            'brand', 'store', 'images', 'is_liked'
        ]
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ProductLike.objects.filter(user=request.user, product=obj).exists()
        return False


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    slug = serializers.SerializerMethodField()

    def get_slug(self, obj):
        if obj.slug:
            return obj.slug
        from django.utils.text import slugify
        base_slug = slugify(obj.name) if obj.name else f'product-{obj.id}'
        unique_slug = base_slug
        i = 1
        from .models import Product
        while Product.objects.filter(slug=unique_slug).exclude(pk=obj.pk).exists():
            unique_slug = f"{base_slug}-{i}"
            i += 1
        obj.slug = unique_slug
        obj.save()
        return unique_slug
    """
    Serializer for creating and updating products.
    """
    
    class Meta:
        model = Product
        fields = [
            'name', 'slug', 'description', 'sku', 'price', 'discount_percentage',
            'in_stock', 'stock_quantity', 'image_urls', 'attributes',
            'is_active', 'is_featured', 'category', 'brand'
        ]
    
    def validate_sku(self, value):
        instance = getattr(self, 'instance', None)
        if Product.objects.filter(sku=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("SKU must be unique")
        return value


class ProductLikeSerializer(serializers.ModelSerializer):
    """
    Serializer for product likes.
    """
    
    class Meta:
        model = ProductLike
        fields = ['id', 'user', 'product', 'created_at']
        read_only_fields = ['user']


class ProductReviewSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        user = self.context['request'].user
        product = attrs.get('product') or self.instance.product if self.instance else None
        if user.is_authenticated and product:
            from .models import ProductReview
            exists = ProductReview.objects.filter(user=user, product=product).exists()
            if exists and not self.instance:
                raise serializers.ValidationError("لا يمكنك إضافة أكثر من مراجعة لنفس المنتج.")
        return attrs
    """
    Serializer for product reviews.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ProductReview
        fields = ['id', 'user_name', 'user', 'product', 'rating', 'comment', 'sentiment', 'is_owner', 'created_at']
        read_only_fields = ['id', 'user', 'product', 'created_at', 'user_name']
