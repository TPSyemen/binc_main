"""
Django management command to populate the database with dummy data for testing purposes.

This command creates sample users, categories, brands, stores, products, and promotions
to facilitate development and testing of the e-commerce platform.

Usage:
    python manage.py populate_db --count 20 --clear
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction, models
from decimal import Decimal
import random
from datetime import timedelta

# Import models from different apps
from products.models import Category, Brand, Store, Product
from promotions.models import Promotion
from auth_app.models import UserProfile

# Import Faker for generating realistic dummy data
try:
    from faker import Faker
    fake = Faker()
except ImportError:
    raise CommandError(
        "Faker library is required. Install it with: pip install Faker"
    )

User = get_user_model()


class Command(BaseCommand):
    """
    Django management command to populate database with dummy data.
    """
    help = 'Populate the database with dummy data for testing purposes'

    def add_arguments(self, parser):
        """
        Add command line arguments for customizing data generation.
        
        Args:
            parser: ArgumentParser instance to add arguments to
        """
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of products to create (default: 10)'
        )
        
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before populating (WARNING: This will delete existing data)'
        )

    def handle(self, *args, **options):
        """
        Main command execution logic.
        
        Args:
            *args: Positional arguments
            **options: Command options from add_arguments
        """
        # Get command options
        count = options['count']
        clear_data = options['clear']
        
        # Display command start message
        self.stdout.write(
            self.style.SUCCESS(
                f'🚀 Starting database population with {count} products...'
            )
        )
        
        try:
            with transaction.atomic():
                # Step 1: Clear existing data if requested
                if clear_data:
                    self._clear_existing_data()
                
                # Step 2: Create default users
                self._create_default_users()
                
                # Step 3: Create categories
                categories = self._create_categories()
                
                # Step 4: Create brands
                brands = self._create_brands()
                
                # Step 5: Create stores
                stores = self._create_stores()
                
                # Step 6: Create products
                self._create_products(count, categories, brands, stores)
                
                # Step 7: Create promotions
                self._create_promotions()
                
                # Success message
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Successfully populated database with {count} products and related data!'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error occurred: {str(e)}')
            )
            raise CommandError(f'Failed to populate database: {str(e)}')

    def _clear_existing_data(self):
        """
        Clear existing data from the database.
        
        Note: Deletes data in order to avoid foreign key constraint issues.
        Does not delete admin users to preserve system access.
        """
        self.stdout.write(
            self.style.WARNING('🗑️  Clearing existing data...')
        )
        
        # Delete in reverse dependency order to avoid foreign key issues
        Product.objects.all().delete()
        Promotion.objects.all().delete()
        Store.objects.all().delete()
        Brand.objects.all().delete()
        Category.objects.all().delete()
        
        # Delete non-admin users (preserve admin access)
        User.objects.filter(is_superuser=False, is_staff=False).delete()
        
        self.stdout.write(
            self.style.WARNING('✅ Existing data cleared successfully')
        )

    def _create_default_users(self):
        """
        Create default users with different roles for testing.
        
        Creates:
        - System Admin
        - Store Owner  
        - Customer
        """
        self.stdout.write('👥 Creating default users...')
        
        # Default users data
        default_users = [
            {
                'username': 'admin',
                'email': 'admin@example.com',
                'password': 'password123',
                'role': 'admin',
                'first_name': 'System',
                'last_name': 'Administrator'
            },
            {
                'username': 'store_owner',
                'email': 'owner@example.com', 
                'password': 'password123',
                'role': 'store_owner',
                'first_name': 'Store',
                'last_name': 'Owner'
            },
            {
                'username': 'customer',
                'email': 'user@example.com',
                'password': 'password123', 
                'role': 'customer',
                'first_name': 'Test',
                'last_name': 'Customer'
            }
        ]
        
        for user_data in default_users:
            # Check if user already exists by username or email
            if not User.objects.filter(
                models.Q(username=user_data['username']) |
                models.Q(email=user_data['email'])
            ).exists():
                user = User.objects.create_user(
                    username=user_data['username'],
                    email=user_data['email'],
                    password=user_data['password'],
                    role=user_data['role'],
                    first_name=user_data['first_name'],
                    last_name=user_data['last_name'],
                    email_verified=True
                )

                # Set additional fields for admin user
                if user_data['role'] == 'admin':
                    user.is_staff = True
                    user.is_superuser = True
                    user.save()

                # Create user profile
                UserProfile.objects.create(
                    user=user,
                    bio=f"Default {user_data['role']} account for testing",
                    location=fake.city()
                )

                self.stdout.write(f'  ✅ Created user: {user.email} ({user.get_role_display()})')
            else:
                self.stdout.write(f'  ⚠️  User already exists: {user_data["email"]}')

    def _create_categories(self):
        """
        Create sample product categories.
        
        Returns:
            list: List of created Category objects
        """
        self.stdout.write('📂 Creating product categories...')
        
        # Sample categories data
        categories_data = [
            {'name': 'Electronics', 'description': 'Electronic devices and gadgets'},
            {'name': 'Clothing', 'description': 'Fashion and apparel'},
            {'name': 'Home & Garden', 'description': 'Home improvement and garden supplies'},
            {'name': 'Sports & Outdoors', 'description': 'Sports equipment and outdoor gear'},
            {'name': 'Books', 'description': 'Books and educational materials'},
            {'name': 'Health & Beauty', 'description': 'Health and beauty products'},
        ]
        
        categories = []
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'description': cat_data['description'],
                    'is_active': True
                }
            )
            categories.append(category)
            
            if created:
                self.stdout.write(f'  ✅ Created category: {category.name}')
            else:
                self.stdout.write(f'  ⚠️  Category already exists: {category.name}')
        
        return categories

    def _create_brands(self):
        """
        Create sample product brands.

        Returns:
            list: List of created Brand objects
        """
        self.stdout.write('🏷️  Creating product brands...')

        # Sample brands data
        brands_data = [
            {'name': 'TechCorp', 'description': 'Leading technology brand'},
            {'name': 'FashionPlus', 'description': 'Premium fashion brand'},
            {'name': 'HomeStyle', 'description': 'Modern home solutions'},
            {'name': 'SportMax', 'description': 'Professional sports equipment'},
            {'name': 'BookWorld', 'description': 'Educational publishing house'},
            {'name': 'BeautyLux', 'description': 'Luxury beauty products'},
        ]

        brands = []
        for brand_data in brands_data:
            brand, created = Brand.objects.get_or_create(
                name=brand_data['name'],
                defaults={
                    'description': brand_data['description'],
                    'is_active': True
                }
            )
            brands.append(brand)

            if created:
                self.stdout.write(f'  ✅ Created brand: {brand.name}')
            else:
                self.stdout.write(f'  ⚠️  Brand already exists: {brand.name}')

        return brands

    def _create_stores(self):
        """
        Create sample stores owned by store owners.

        Returns:
            list: List of created Store objects
        """
        self.stdout.write('🏪 Creating sample stores...')

        # Get store owners
        store_owners = User.objects.filter(role='store_owner')
        if not store_owners.exists():
            self.stdout.write(
                self.style.WARNING('⚠️  No store owners found. Creating additional store owner...')
            )
            # Create additional store owner
            store_owner = User.objects.create_user(
                username=f'owner_{fake.user_name()}',
                email=fake.email(),
                password='password123',
                role='store_owner',
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                email_verified=True
            )
            UserProfile.objects.create(
                user=store_owner,
                bio=fake.text(max_nb_chars=200),
                location=fake.city()
            )
            store_owners = [store_owner]

        # Sample stores data
        stores_data = [
            {
                'name': 'Tech Paradise',
                'description': 'Your one-stop shop for all electronic needs',
                'email': 'contact@techparadise.com',
                'phone': '+1234567890',
                'address': fake.address()
            },
            {
                'name': 'Fashion Hub',
                'description': 'Latest trends in fashion and style',
                'email': 'info@fashionhub.com',
                'phone': '+1234567891',
                'address': fake.address()
            },
            {
                'name': 'Home Essentials',
                'description': 'Everything you need for your home',
                'email': 'support@homeessentials.com',
                'phone': '+1234567892',
                'address': fake.address()
            }
        ]

        stores = []
        for i, store_data in enumerate(stores_data):
            # Assign store to a store owner (cycle through available owners)
            owner = store_owners[i % len(store_owners)]

            store, created = Store.objects.get_or_create(
                name=store_data['name'],
                defaults={
                    'owner': owner,
                    'description': store_data['description'],
                    'email': store_data['email'],
                    'phone': store_data['phone'],
                    'address': store_data['address'],
                    'is_active': True,
                    'is_verified': True,
                    'average_rating': round(random.uniform(3.5, 5.0), 1),
                    'total_orders_count': random.randint(50, 500),
                    'customer_service_score': round(random.uniform(3.0, 5.0), 1)
                }
            )
            stores.append(store)

            if created:
                self.stdout.write(f'  ✅ Created store: {store.name} (Owner: {owner.username})')
            else:
                self.stdout.write(f'  ⚠️  Store already exists: {store.name}')

        return stores

    def _create_products(self, count, categories, brands, stores):
        """
        Create sample products with realistic data.

        Args:
            count (int): Number of products to create
            categories (list): List of Category objects
            brands (list): List of Brand objects
            stores (list): List of Store objects
        """
        self.stdout.write(f'📦 Creating {count} sample products...')

        # Sample product names by category
        product_templates = {
            'Electronics': [
                'Smartphone', 'Laptop', 'Tablet', 'Headphones', 'Smart Watch',
                'Camera', 'Gaming Console', 'Bluetooth Speaker', 'Monitor', 'Keyboard'
            ],
            'Clothing': [
                'T-Shirt', 'Jeans', 'Dress', 'Jacket', 'Sneakers',
                'Hoodie', 'Shorts', 'Sweater', 'Boots', 'Hat'
            ],
            'Home & Garden': [
                'Coffee Maker', 'Vacuum Cleaner', 'Garden Tools', 'Lamp', 'Cushion',
                'Plant Pot', 'Kitchen Set', 'Bedding', 'Mirror', 'Storage Box'
            ],
            'Sports & Outdoors': [
                'Running Shoes', 'Yoga Mat', 'Bicycle', 'Tennis Racket', 'Backpack',
                'Water Bottle', 'Fitness Tracker', 'Camping Tent', 'Soccer Ball', 'Dumbbells'
            ],
            'Books': [
                'Programming Guide', 'Novel', 'Cookbook', 'History Book', 'Science Manual',
                'Art Book', 'Biography', 'Travel Guide', 'Self-Help Book', 'Dictionary'
            ],
            'Health & Beauty': [
                'Face Cream', 'Shampoo', 'Perfume', 'Makeup Kit', 'Vitamin Supplements',
                'Hair Dryer', 'Skincare Set', 'Nail Polish', 'Body Lotion', 'Toothbrush'
            ]
        }

        created_count = 0
        for i in range(count):
            try:
                # Select random category, brand, and store
                category = random.choice(categories)
                brand = random.choice(brands)
                store = random.choice(stores)

                # Get product template based on category
                category_products = product_templates.get(category.name, ['Generic Product'])
                base_name = random.choice(category_products)

                # Generate unique product name and SKU
                product_name = f"{brand.name} {base_name} {fake.word().title()}"
                sku = f"{brand.name[:3].upper()}{fake.random_number(digits=6)}"

                # Ensure SKU is unique
                while Product.objects.filter(sku=sku).exists():
                    sku = f"{brand.name[:3].upper()}{fake.random_number(digits=6)}"

                # Generate realistic pricing
                base_price = random.uniform(10, 1000)
                discount = random.uniform(0, 30) if random.random() < 0.3 else 0

                # Generate product attributes based on category
                attributes = self._generate_product_attributes(category.name)

                # Create product
                product = Product.objects.create(
                    store=store,
                    category=category,
                    brand=brand,
                    name=product_name,
                    description=fake.text(max_nb_chars=500),
                    sku=sku,
                    price=Decimal(str(round(base_price, 2))),
                    discount_percentage=Decimal(str(round(discount, 2))),
                    in_stock=random.choice([True, True, True, False]),  # 75% in stock
                    stock_quantity=random.randint(0, 100),
                    image_urls=[
                        f"https://via.placeholder.com/400x400?text={product_name.replace(' ', '+')}"
                    ],
                    average_rating=round(random.uniform(2.0, 5.0), 1),
                    total_reviews=random.randint(0, 200),
                    view_count=random.randint(10, 1000),
                    attributes=attributes,
                    is_active=True,
                    is_featured=random.choice([True, False])
                )

                created_count += 1

                if created_count % 10 == 0:
                    self.stdout.write(f'  📦 Created {created_count}/{count} products...')

            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  Failed to create product {i+1}: {str(e)}')
                )

        self.stdout.write(f'  ✅ Successfully created {created_count} products')

    def _generate_product_attributes(self, category_name):
        """
        Generate realistic product attributes based on category.

        Args:
            category_name (str): Name of the product category

        Returns:
            dict: Product attributes dictionary
        """
        base_attributes = {
            'color': random.choice(['Black', 'White', 'Blue', 'Red', 'Green', 'Gray']),
            'weight': f"{random.uniform(0.1, 5.0):.1f} kg",
            'warranty': random.choice(['1 year', '2 years', '3 years', '6 months'])
        }

        # Category-specific attributes
        if category_name == 'Electronics':
            base_attributes.update({
                'screen_size': f"{random.uniform(5.0, 32.0):.1f} inches",
                'battery_life': f"{random.randint(6, 48)} hours",
                'connectivity': random.choice(['WiFi', 'Bluetooth', 'WiFi + Bluetooth'])
            })
        elif category_name == 'Clothing':
            base_attributes.update({
                'size': random.choice(['XS', 'S', 'M', 'L', 'XL', 'XXL']),
                'material': random.choice(['Cotton', 'Polyester', 'Wool', 'Silk', 'Denim']),
                'care_instructions': 'Machine wash cold'
            })
        elif category_name == 'Home & Garden':
            base_attributes.update({
                'dimensions': f"{random.randint(10, 100)}x{random.randint(10, 100)}x{random.randint(10, 100)} cm",
                'power_consumption': f"{random.randint(50, 2000)}W",
                'room_type': random.choice(['Kitchen', 'Living Room', 'Bedroom', 'Bathroom'])
            })

        return base_attributes

    def _create_promotions(self):
        """
        Create sample promotional campaigns.
        """
        self.stdout.write('🎯 Creating sample promotions...')

        # Get admin user to create promotions
        admin_user = User.objects.filter(role='admin').first()
        if not admin_user:
            admin_user = User.objects.filter(is_superuser=True).first()

        if not admin_user:
            self.stdout.write(
                self.style.WARNING('⚠️  No admin user found. Skipping promotion creation.')
            )
            return

        # Sample promotions data
        promotions_data = [
            {
                'name': 'Summer Sale 2024',
                'description': 'Get amazing discounts on all summer products!',
                'discount_type': 'percentage',
                'value': Decimal('20.00'),
                'max_uses': 100,
                'minimum_order_amount': Decimal('50.00')
            },
            {
                'name': 'New Customer Welcome',
                'description': 'Special discount for new customers',
                'discount_type': 'fixed_amount',
                'value': Decimal('10.00'),
                'max_uses': 500,
                'minimum_order_amount': Decimal('30.00')
            },
            {
                'name': 'Buy One Get One Free',
                'description': 'Buy one product and get another one free!',
                'discount_type': 'buy_one_get_one',
                'value': Decimal('50.00'),
                'max_uses': 50,
                'minimum_order_amount': Decimal('25.00')
            }
        ]

        for promo_data in promotions_data:
            # Set promotion dates (current time to 30 days from now)
            start_date = timezone.now()
            end_date = start_date + timedelta(days=30)

            promotion, created = Promotion.objects.get_or_create(
                name=promo_data['name'],
                defaults={
                    'description': promo_data['description'],
                    'discount_type': promo_data['discount_type'],
                    'value': promo_data['value'],
                    'start_date': start_date,
                    'end_date': end_date,
                    'max_uses': promo_data['max_uses'],
                    'max_uses_per_user': 1,
                    'minimum_order_amount': promo_data['minimum_order_amount'],
                    'is_active': True,
                    'created_by': admin_user
                }
            )

            if created:
                self.stdout.write(f'  ✅ Created promotion: {promotion.name}')
            else:
                self.stdout.write(f'  ⚠️  Promotion already exists: {promotion.name}')

        self.stdout.write('  ✅ Promotions creation completed')
