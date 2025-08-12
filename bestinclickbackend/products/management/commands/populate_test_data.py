"""
سكربت لتوليد بيانات اختبار شاملة للنظام.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.text import slugify
from django.db import transaction
from faker import Faker
import random
from datetime import timedelta

from products.models import Category, Brand, Store, Product
from comments.models import Comment, AISentimentAnalysisResult
from ai_models.models import UserBehaviorLog, AIModelPerformance

User = get_user_model()
fake = Faker(['ar_SA', 'en_US'])

# قائمة منتجات إلكترونية للاختيار منها
PRODUCT_NAMES = [
    "هاتف ذكي",
    "لابتوب",
    "تابلت",
    "سماعات لاسلكية",
    "ساعة ذكية",
    "شاشة LED",
    "كاميرا رقمية",
    "مكبر صوت",
    "راوتر واي فاي",
    "باور بانك",
    "طابعة ليزر",
    "ماسح ضوئي",
    "لوحة مفاتيح",
    "ماوس لاسلكي",
    "شاحن سريع",
]

class Command(BaseCommand):
    help = 'توليد بيانات اختبار شاملة للنظام'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=50,
            help='عدد المستخدمين'
        )
        parser.add_argument(
            '--products',
            type=int,
            default=100,
            help='عدد المنتجات'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='مسح البيانات القديمة قبل توليد بيانات جديدة'
        )

    def handle(self, *args, **options):
        try:
            with transaction.atomic():
                if options['clear']:
                    self.stdout.write('جاري مسح البيانات القديمة...')
                    User.objects.exclude(is_superuser=True).delete()
                    Store.objects.all().delete()
                    Product.objects.all().delete()
                    Comment.objects.all().delete()
                    UserBehaviorLog.objects.all().delete()
                    AIModelPerformance.objects.all().delete()
                
                self.stdout.write('بدء توليد البيانات...')
                
                # التحقق من وجود التصنيفات والعلامات التجارية
                if not Category.objects.exists():
                    self.stdout.write(self.style.ERROR('لا توجد تصنيفات! يرجى إضافة التصنيفات أولاً.'))
                    return
                
                if not Brand.objects.exists():
                    self.stdout.write(self.style.ERROR('لا توجد علامات تجارية! يرجى إضافة العلامات التجارية أولاً.'))
                    return
                
                # توليد المستخدمين
                self._create_users(options['users'])
                self.stdout.write(self.style.SUCCESS(f"تم إنشاء {options['users']} مستخدم"))
                
                # توليد المتاجر والمنتجات
                self._create_stores_and_products(options['products'])
                self.stdout.write(self.style.SUCCESS(f"تم إنشاء المتاجر والمنتجات"))
                
                # توليد التفاعلات وسلوك المستخدمين
                self._create_user_behavior()
                self.stdout.write(self.style.SUCCESS("تم إنشاء سجلات سلوك المستخدمين"))
                
                # توليد التعليقات وتحليل المشاعر
                self._create_comments_and_sentiment()
                self.stdout.write(self.style.SUCCESS("تم إنشاء التعليقات وتحليل المشاعر"))
                
                # توليد بيانات أداء نماذج الذكاء الاصطناعي
                self._create_ai_performance_data()
                self.stdout.write(self.style.SUCCESS("تم إنشاء بيانات أداء نماذج الذكاء الاصطناعي"))
                
                self.stdout.write(self.style.SUCCESS('تم توليد جميع البيانات بنجاح!'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'حدث خطأ: {str(e)}'))
            raise

    def _create_users(self, count):
        """توليد مستخدمين متنوعين"""
        roles = ['customer', 'store_owner', 'admin']
        weights = [0.7, 0.25, 0.05]  # نسب توزيع الأدوار
        
        for i in range(count):
            role = random.choices(roles, weights=weights)[0]
            username = f"{fake.user_name()}_{random.randint(1000, 9999)}"
            
            User.objects.create_user(
                username=username,
                email=fake.email(),
                password='testpass123',
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                role=role,
                phone_number=fake.phone_number(),
                date_of_birth=fake.date_of_birth(minimum_age=18, maximum_age=70),
                email_verified=True
            )

    def _create_stores_and_products(self, count):
        """توليد متاجر ومنتجات"""
        store_owners = User.objects.filter(role='store_owner')
        categories = list(Category.objects.all())
        brands = list(Brand.objects.all())
        
        for owner in store_owners:
            store_name = fake.company()
            # إنشاء slug فريد للمتجر
            base_slug = slugify(f"{store_name}-{owner.username}")
            unique_slug = base_slug
            counter = 1
            
            while Store.objects.filter(slug=unique_slug).exists():
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            
            store = Store.objects.create(
                owner=owner,
                name=store_name,
                slug=unique_slug,
                description=fake.paragraph(),
                email=fake.company_email(),
                phone=fake.phone_number(),
                address=fake.address(),
                is_active=True,
                is_verified=True
            )
            
            # إنشاء منتجات للمتجر
            products_per_store = count // len(store_owners)
            for _ in range(products_per_store):
                base_name = random.choice(PRODUCT_NAMES)
                brand = random.choice(brands)
                model_year = random.randint(2020, 2024)
                name = f"{brand.name} {base_name} {model_year}"
                
                # إنشاء slug فريد للمنتج
                product_base_slug = slugify(f"{name}-{store.name}")
                product_unique_slug = product_base_slug
                product_counter = 1
                
                while Product.objects.filter(slug=product_unique_slug).exists():
                    product_unique_slug = f"{product_base_slug}-{product_counter}"
                    product_counter += 1
                
                Product.objects.create(
                    store=store,
                    category=random.choice(categories),
                    brand=brand,
                    name=name,
                    slug=product_unique_slug,
                    description=fake.paragraph(),
                    sku=fake.unique.ean13(),
                    price=random.uniform(100, 5000),
                    stock_quantity=random.randint(0, 100),
                    attributes={
                        'color': fake.color_name(),
                        'weight': f"{random.uniform(0.1, 5):.2f} kg",
                        'dimensions': f"{random.randint(10, 50)}x{random.randint(10, 50)}x{random.randint(10, 50)} cm",
                        'model_year': model_year
                    }
                )

    def _create_user_behavior(self):
        """توليد سجلات سلوك المستخدمين"""
        users = list(User.objects.filter(role='customer'))
        products = list(Product.objects.all())
        actions = ['view', 'click', 'add_to_cart', 'like', 'search']
        
        for user in users:
            # توليد 10-30 تفاعل لكل مستخدم
            for _ in range(random.randint(10, 30)):
                action = random.choice(actions)
                product = random.choice(products) if action != 'search' else None
                
                metadata = {}
                if action == 'search':
                    metadata['search_query'] = random.choice(PRODUCT_NAMES)
                elif action == 'view':
                    metadata['time_spent'] = random.randint(10, 300)
                
                UserBehaviorLog.objects.create(
                    user=user,
                    product=product,
                    action_type=action,
                    metadata=metadata,
                    timestamp=timezone.now() - timedelta(days=random.randint(0, 30))
                )

    def _create_comments_and_sentiment(self):
        """توليد تعليقات وتحليل المشاعر"""
        users = list(User.objects.filter(role='customer'))
        products = list(Product.objects.all())
        
        positive_comments = [
            "منتج رائع! جودة ممتازة وسعر معقول",
            "أفضل شراء قمت به هذا العام",
            "خدمة عملاء متميزة وتوصيل سريع",
            "يستحق كل قرش! ممتاز",
            "تجربة شراء مميزة وسأكررها"
        ]
        
        negative_comments = [
            "لم يعجبني المنتج، جودة سيئة",
            "سعر مرتفع مقارنة بالجودة",
            "خدمة عملاء سيئة",
            "وصل المنتج متأخراً وبحالة سيئة",
            "لا أنصح به إطلاقاً"
        ]
        
        neutral_comments = [
            "منتج عادي، يؤدي الغرض",
            "سعر مقبول، جودة معقولة",
            "تجربة شراء عادية",
            "لا بأس به",
            "يحتاج بعض التحسينات"
        ]
        
        for user in users:
            # اختيار منتجات عشوائية لهذا المستخدم
            user_products = random.sample(products, min(random.randint(3, 7), len(products)))
            
            for product in user_products:
                sentiment_type = random.choices(
                    ['positive', 'negative', 'neutral'],
                    weights=[0.6, 0.2, 0.2]
                )[0]
                
                if sentiment_type == 'positive':
                    text = random.choice(positive_comments)
                    rating = random.randint(4, 5)
                elif sentiment_type == 'negative':
                    text = random.choice(negative_comments)
                    rating = random.randint(1, 2)
                else:
                    text = random.choice(neutral_comments)
                    rating = 3
                
                try:
                    comment = Comment.objects.create(
                        user=user,
                        product=product,
                        text=text,
                        rating=rating,
                        is_verified_purchase=random.choice([True, False])
                    )
                    
                    # إنشاء تحليل المشاعر
                    AISentimentAnalysisResult.objects.create(
                        comment=comment,
                        sentiment=sentiment_type,
                        confidence_score=random.uniform(0.7, 0.95),
                        emotion_scores={
                            'joy': random.uniform(0, 1),
                            'sadness': random.uniform(0, 1),
                            'anger': random.uniform(0, 1)
                        },
                        keywords=['جودة', 'سعر', 'خدمة'] if sentiment_type == 'positive' else ['سيء', 'مشكلة', 'تأخير']
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'خطأ في إنشاء تعليق: {str(e)}'))

    def _create_ai_performance_data(self):
        """توليد بيانات أداء نماذج الذكاء الاصطناعي"""
        model_types = [
            'recommendation',
            'search',
            'sentiment',
            'comparison',
            'personalization'
        ]
        
        for model_type in model_types:
            # إنشاء 5 سجلات أداء لكل نوع نموذج
            for version in range(1, 6):
                AIModelPerformance.objects.create(
                    model_type=model_type,
                    model_version=f"v{version}.0.0",
                    accuracy_score=random.uniform(0.75, 0.95),
                    precision_score=random.uniform(0.75, 0.95),
                    recall_score=random.uniform(0.75, 0.95),
                    f1_score=random.uniform(0.75, 0.95),
                    total_predictions=random.randint(1000, 10000),
                    successful_predictions=random.randint(800, 9000),
                    average_response_time=random.uniform(50, 200),
                    custom_metrics={
                        'false_positives': random.randint(10, 100),
                        'false_negatives': random.randint(10, 100),
                        'training_time': random.uniform(100, 1000)
                    }
                )