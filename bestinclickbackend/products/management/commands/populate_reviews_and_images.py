"""
Django management command to populate the database with sample product reviews and images.

This command creates realistic product reviews with varied ratings, sentiment analysis data,
and adds product images to enhance the testing experience for the e-commerce platform.

Usage:
    python manage.py populate_reviews_and_images --reviews 50 --clear-reviews
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction, models
from decimal import Decimal
import random
from datetime import timedelta, datetime

# Import models from different apps
from products.models import Product, ProductImage
from comments.models import Comment, CommentHelpfulness, AISentimentAnalysisResult
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
    Django management command to populate database with sample reviews and images.
    """
    help = 'Populate the database with sample product reviews and images for testing'

    def add_arguments(self, parser):
        """
        Add command line arguments for customizing data generation.
        
        Args:
            parser: ArgumentParser instance to add arguments to
        """
        parser.add_argument(
            '--reviews',
            type=int,
            default=50,
            help='Number of reviews to create (default: 50)'
        )
        
        parser.add_argument(
            '--clear-reviews',
            action='store_true',
            help='Clear existing reviews before populating'
        )
        
        parser.add_argument(
            '--add-images',
            action='store_true',
            help='Add product images from placeholder services'
        )
        
        parser.add_argument(
            '--create-users',
            action='store_true',
            help='Create additional test users for reviews'
        )

    def handle(self, *args, **options):
        """
        Main command execution logic.
        
        Args:
            *args: Positional arguments
            **options: Command options from add_arguments
        """
        # Get command options
        review_count = options['reviews']
        clear_reviews = options['clear_reviews']
        add_images = options['add_images']
        create_users = options['create_users']
        
        # Display command start message
        self.stdout.write(
            self.style.SUCCESS(
                f'🚀 Starting database population with {review_count} reviews...'
            )
        )
        
        try:
            with transaction.atomic():
                # Step 1: Clear existing reviews if requested
                if clear_reviews:
                    self._clear_existing_reviews()
                
                # Step 2: Create additional test users if requested
                if create_users:
                    self._create_test_users()
                
                # Step 3: Add product images if requested
                if add_images:
                    self._add_product_images()
                
                # Step 4: Create sample reviews
                self._create_sample_reviews(review_count)
                
                # Step 5: Create helpfulness votes
                self._create_helpfulness_votes()
                
                # Step 6: Generate AI sentiment analysis
                self._generate_sentiment_analysis()
                
                # Success message
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Successfully populated database with {review_count} reviews and related data!'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error occurred: {str(e)}')
            )
            raise CommandError(f'Failed to populate database: {str(e)}')

    def _clear_existing_reviews(self):
        """
        Clear existing review data from the database.
        """
        self.stdout.write(
            self.style.WARNING('🗑️  Clearing existing review data...')
        )
        
        # Delete in order to avoid foreign key issues
        AISentimentAnalysisResult.objects.all().delete()
        CommentHelpfulness.objects.all().delete()
        Comment.objects.all().delete()
        
        self.stdout.write(
            self.style.WARNING('✅ Existing review data cleared successfully')
        )

    def _create_test_users(self):
        """
        Create additional test users for creating diverse reviews.
        """
        self.stdout.write('👥 Creating additional test users...')
        
        # Create 10 additional customer users
        for i in range(10):
            username = f'customer_{fake.user_name()}_{i}'
            email = f'customer{i}_{fake.email()}'
            
            # Check if user already exists
            if not User.objects.filter(
                models.Q(username=username) | models.Q(email=email)
            ).exists():
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password='password123',
                    role='customer',
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    email_verified=True
                )
                
                # Create user profile
                UserProfile.objects.create(
                    user=user,
                    bio=fake.text(max_nb_chars=200),
                    location=fake.city(),
                    newsletter_subscription=random.choice([True, False]),
                    marketing_emails=random.choice([True, False])
                )
                
                self.stdout.write(f'  ✅ Created test user: {user.username}')
        
        self.stdout.write('✅ Test users creation completed')

    def _add_product_images(self):
        """
        Add product images from placeholder services to existing products.
        """
        self.stdout.write('🖼️  Adding product images...')

        products = Product.objects.filter(is_active=True)
        if not products.exists():
            self.stdout.write(
                self.style.WARNING('⚠️  No products found. Please run populate_db first.')
            )
            return

        # Image categories mapping
        image_categories = {
            'Electronics': ['technology', 'gadgets', 'electronics'],
            'Clothing': ['fashion', 'clothing', 'apparel'],
            'Home & Garden': ['home', 'furniture', 'garden'],
            'Sports & Outdoors': ['sports', 'fitness', 'outdoor'],
            'Books': ['books', 'education', 'reading'],
            'Health & Beauty': ['beauty', 'cosmetics', 'health']
        }

        for product in products:
            try:
                # Get category-specific image keywords
                category_keywords = image_categories.get(product.category.name, ['product'])
                keyword = random.choice(category_keywords)

                # Generate multiple image URLs for each product
                image_urls = []
                for i in range(random.randint(2, 5)):  # 2-5 images per product
                    # Use different placeholder services for variety
                    services = [
                        f"https://picsum.photos/400/400?random={product.id}{i}",
                        f"https://via.placeholder.com/400x400/0066CC/FFFFFF?text={product.name.replace(' ', '+')[:20]}",
                        f"https://dummyimage.com/400x400/cccccc/000000&text={keyword.title()}"
                    ]
                    image_urls.append(random.choice(services))

                # Update product image URLs
                product.image_urls = image_urls
                product.save()

                # Create ProductImage objects for additional images
                for idx, url in enumerate(image_urls):
                    ProductImage.objects.get_or_create(
                        product=product,
                        image=url,  # In a real scenario, you'd download and save the file
                        defaults={
                            'alt_text': f"{product.name} - Image {idx + 1}",
                            'is_primary': idx == 0,
                            'sort_order': idx
                        }
                    )

                self.stdout.write(f'  ✅ Added {len(image_urls)} images to: {product.name}')

            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  Failed to add images to {product.name}: {str(e)}')
                )

        self.stdout.write('✅ Product images addition completed')

    def _create_sample_reviews(self, count):
        """
        Create realistic sample reviews for products.

        Args:
            count (int): Number of reviews to create
        """
        self.stdout.write(f'📝 Creating {count} sample reviews...')

        # Get available products and users
        products = list(Product.objects.filter(is_active=True))
        users = list(User.objects.filter(role='customer'))

        if not products:
            self.stdout.write(
                self.style.WARNING('⚠️  No products found. Please run populate_db first.')
            )
            return

        if not users:
            self.stdout.write(
                self.style.WARNING('⚠️  No customer users found. Creating some...')
            )
            self._create_test_users()
            users = list(User.objects.filter(role='customer'))

        # Sample review templates by rating
        review_templates = {
            5: [
                "Absolutely amazing product! Exceeded all my expectations. Highly recommend!",
                "Perfect quality and fast shipping. Will definitely buy again!",
                "Outstanding product! Worth every penny. Five stars!",
                "Incredible value for money. Best purchase I've made this year!",
                "Fantastic product! Works exactly as described. Love it!",
                "Excellent quality and great customer service. Highly satisfied!",
                "Amazing product! Better than I expected. Will recommend to friends!",
                "Perfect! Exactly what I was looking for. Great quality!",
                "Superb product! Fast delivery and excellent packaging. Very happy!",
                "Outstanding! This product has changed my daily routine for the better!"
            ],
            4: [
                "Great product overall. Minor issues but still very satisfied.",
                "Good quality and value. Would recommend with small reservations.",
                "Very good product. Works well but could be improved slightly.",
                "Solid product. Good quality for the price. Happy with purchase.",
                "Nice product! Good features but room for improvement.",
                "Good purchase. Quality is decent and delivery was on time.",
                "Pretty good product. Does what it's supposed to do well.",
                "Good value for money. Some minor flaws but overall satisfied.",
                "Decent product. Good quality but not exceptional.",
                "Good product overall. Would buy again but with some hesitation."
            ],
            3: [
                "Average product. Does the job but nothing special.",
                "Okay product. Some good points, some bad. Mixed feelings.",
                "Decent but not great. Works as expected but could be better.",
                "Average quality. Price is fair but expected more.",
                "It's okay. Does what it says but not impressed.",
                "Mediocre product. Some issues but usable.",
                "Average experience. Product works but has limitations.",
                "Neutral feelings about this product. It's just okay.",
                "Fair product. Some good features but also some problems.",
                "Middle of the road product. Neither great nor terrible."
            ],
            2: [
                "Disappointing product. Several issues and poor quality.",
                "Not satisfied. Product has multiple problems and defects.",
                "Poor quality for the price. Would not recommend.",
                "Below expectations. Many issues and poor customer service.",
                "Unsatisfied with this purchase. Quality is subpar.",
                "Not good. Product broke after short use. Poor value.",
                "Disappointing experience. Product doesn't work as advertised.",
                "Poor quality control. Received defective item.",
                "Not worth the money. Too many problems and issues.",
                "Regret buying this. Quality is much lower than expected."
            ],
            1: [
                "Terrible product! Complete waste of money. Do not buy!",
                "Awful quality. Broke immediately. Worst purchase ever!",
                "Horrible experience. Product is completely useless.",
                "Extremely disappointed. Product is defective and unusable.",
                "Worst product ever! Save your money and buy something else.",
                "Complete garbage. Doesn't work at all. Very angry!",
                "Terrible quality and even worse customer service. Avoid!",
                "Absolutely horrible. Product fell apart immediately.",
                "Don't waste your money! This product is completely broken.",
                "Extremely poor quality. Completely unsatisfied and angry!"
            ]
        }

        created_count = 0
        for i in range(count):
            try:
                # Select random product and user
                product = random.choice(products)
                user = random.choice(users)

                # Check if user already reviewed this product (unique constraint)
                if Comment.objects.filter(user=user, product=product).exists():
                    continue

                # Generate rating with weighted distribution (more positive reviews)
                rating_weights = [5, 15, 25, 35, 20]  # 1-5 stars weights
                rating = random.choices(range(1, 6), weights=rating_weights)[0]

                # Select appropriate review text
                review_text = random.choice(review_templates[rating])

                # Add some variation to the review text
                if random.random() < 0.3:  # 30% chance to add extra details
                    extra_details = [
                        " The packaging was excellent.",
                        " Delivery was very fast.",
                        " Customer service was helpful.",
                        " Good value for the price.",
                        " Would buy from this store again.",
                        " Product matches the description perfectly.",
                        " Easy to use and setup.",
                        " Great build quality.",
                        " Stylish design and good functionality."
                    ]
                    review_text += random.choice(extra_details)

                # Create the review
                comment = Comment.objects.create(
                    user=user,
                    product=product,
                    text=review_text,
                    rating=rating,
                    is_verified_purchase=random.choice([True, False]),  # 50% verified
                    helpful_votes=random.randint(0, 20),
                    is_active=True
                )

                created_count += 1

                if created_count % 10 == 0:
                    self.stdout.write(f'  📝 Created {created_count}/{count} reviews...')

            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  Failed to create review {i+1}: {str(e)}')
                )

        self.stdout.write(f'  ✅ Successfully created {created_count} reviews')

        # Update product review counts and ratings
        self._update_product_review_stats()

    def _update_product_review_stats(self):
        """
        Update product review statistics based on created reviews.
        """
        self.stdout.write('📊 Updating product review statistics...')

        products_with_reviews = Product.objects.filter(comments__isnull=False).distinct()

        for product in products_with_reviews:
            reviews = Comment.objects.filter(product=product, is_active=True)

            if reviews.exists():
                # Calculate average rating
                avg_rating = reviews.aggregate(models.Avg('rating'))['rating__avg']
                total_reviews = reviews.count()

                # Update product
                product.average_rating = round(avg_rating, 1) if avg_rating else 0.0
                product.total_reviews = total_reviews
                product.save()

        self.stdout.write('✅ Product review statistics updated')

    def _create_helpfulness_votes(self):
        """
        Create helpfulness votes for existing reviews.
        """
        self.stdout.write('👍 Creating helpfulness votes...')

        comments = Comment.objects.filter(is_active=True)
        users = list(User.objects.filter(role='customer'))

        if not comments.exists() or not users:
            self.stdout.write(
                self.style.WARNING('⚠️  No comments or users found for helpfulness votes.')
            )
            return

        vote_count = 0
        for comment in comments:
            # Randomly select users to vote on this comment
            num_voters = random.randint(0, min(5, len(users)))  # 0-5 voters per comment
            voters = random.sample(users, num_voters)

            helpful_votes = 0
            for voter in voters:
                # Avoid self-voting
                if voter == comment.user:
                    continue

                # Check if vote already exists
                if CommentHelpfulness.objects.filter(user=voter, comment=comment).exists():
                    continue

                # Create helpfulness vote (80% helpful, 20% not helpful)
                is_helpful = random.random() < 0.8

                CommentHelpfulness.objects.create(
                    user=voter,
                    comment=comment,
                    is_helpful=is_helpful
                )

                if is_helpful:
                    helpful_votes += 1

                vote_count += 1

            # Update comment helpful votes count
            comment.helpful_votes = helpful_votes
            comment.save()

        self.stdout.write(f'  ✅ Created {vote_count} helpfulness votes')

    def _generate_sentiment_analysis(self):
        """
        Generate AI sentiment analysis results for reviews.
        """
        self.stdout.write('🤖 Generating AI sentiment analysis...')

        comments = Comment.objects.filter(is_active=True)

        if not comments.exists():
            self.stdout.write(
                self.style.WARNING('⚠️  No comments found for sentiment analysis.')
            )
            return

        # Sentiment mapping based on rating
        sentiment_mapping = {
            1: ('negative', 0.9),
            2: ('negative', 0.7),
            3: ('neutral', 0.6),
            4: ('positive', 0.7),
            5: ('positive', 0.9)
        }

        # Emotion keywords for different sentiments
        emotion_keywords = {
            'positive': {
                'joy': ['amazing', 'excellent', 'fantastic', 'love', 'perfect', 'outstanding'],
                'satisfaction': ['satisfied', 'happy', 'pleased', 'content', 'glad'],
                'excitement': ['excited', 'thrilled', 'awesome', 'incredible', 'superb']
            },
            'negative': {
                'anger': ['terrible', 'awful', 'horrible', 'angry', 'furious', 'worst'],
                'disappointment': ['disappointed', 'unsatisfied', 'regret', 'poor', 'bad'],
                'frustration': ['frustrated', 'annoying', 'useless', 'waste', 'broken']
            },
            'neutral': {
                'neutral': ['okay', 'average', 'decent', 'fair', 'mediocre', 'acceptable']
            }
        }

        analysis_count = 0
        for comment in comments:
            try:
                # Get sentiment based on rating
                base_sentiment, base_confidence = sentiment_mapping[comment.rating]

                # Add some randomness to confidence
                confidence = max(0.1, min(1.0, base_confidence + random.uniform(-0.2, 0.2)))

                # Generate emotion scores
                emotion_scores = {}
                comment_text_lower = comment.text.lower()

                for emotion_category, keywords in emotion_keywords[base_sentiment].items():
                    score = 0.0
                    for keyword in keywords:
                        if keyword in comment_text_lower:
                            score += 0.3

                    # Add base emotion score
                    if emotion_category == 'joy' and base_sentiment == 'positive':
                        score += 0.7
                    elif emotion_category == 'anger' and base_sentiment == 'negative':
                        score += 0.7
                    elif emotion_category == 'neutral' and base_sentiment == 'neutral':
                        score += 0.6

                    emotion_scores[emotion_category] = min(1.0, score)

                # Extract keywords from review text
                keywords = []
                words = comment.text.lower().split()
                important_words = [word for word in words if len(word) > 4 and word.isalpha()]
                keywords = random.sample(important_words, min(5, len(important_words)))

                # Create sentiment analysis result
                AISentimentAnalysisResult.objects.get_or_create(
                    comment=comment,
                    defaults={
                        'sentiment': base_sentiment,
                        'confidence_score': confidence,
                        'emotion_scores': emotion_scores,
                        'keywords': keywords
                    }
                )

                analysis_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  Failed to create sentiment analysis for comment {comment.id}: {str(e)}')
                )

        self.stdout.write(f'  ✅ Generated {analysis_count} sentiment analysis results')


# Usage Examples:
#
# 1. Basic usage - Create 50 reviews:
#    python manage.py populate_reviews_and_images
#
# 2. Create 100 reviews and clear existing ones:
#    python manage.py populate_reviews_and_images --reviews 100 --clear-reviews
#
# 3. Create reviews, add images, and create test users:
#    python manage.py populate_reviews_and_images --reviews 75 --add-images --create-users
#
# 4. Only add images to existing products:
#    python manage.py populate_reviews_and_images --add-images --reviews 0
#
# 5. Full setup with everything:
#    python manage.py populate_reviews_and_images --reviews 100 --clear-reviews --add-images --create-users
