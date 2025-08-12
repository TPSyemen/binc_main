# دليل تجهيز قاعدة البيانات للاختبار - Best in Click

## المحتويات
1. [تحليل متطلبات البيانات](#تحليل-متطلبات-البيانات)
2. [إضافة البيانات عبر واجهة Django Admin](#إضافة-البيانات-عبر-واجهة-django-admin)
3. [استخدام Django Fixtures](#استخدام-django-fixtures)
4. [سكربت إدارة Django المخصص](#سكربت-إدارة-django-المخصص)
5. [التحقق من عمل النظام](#التحقق-من-عمل-النظام)

## تحليل متطلبات البيانات

### النماذج الأساسية
1. **المستخدمين (User)**:
   - عملاء عاديين
   - مالكي متاجر
   - مدراء نظام

2. **التصنيفات والعلامات التجارية**:
   - تصنيفات المنتجات (Category)
   - العلامات التجارية (Brand)

3. **المتاجر والمنتجات**:
   - المتاجر (Store)
   - المنتجات (Product)
   - صور المنتجات (ProductImage)

4. **التعليقات والتقييمات**:
   - التعليقات (Comment)
   - تحليل المشاعر (AISentimentAnalysisResult)

5. **سلوك المستخدم**:
   - سجلات السلوك (UserBehaviorLog)
   - تفاعلات الجلسة (UserSessionInteraction)

6. **أداء نماذج الذكاء الاصطناعي**:
   - مقاييس الأداء (AIModelPerformance)

## إضافة البيانات عبر واجهة Django Admin

### الوصول إلى واجهة الإدارة
1. قم بإنشاء مستخدم مدير:
   ```bash
   python manage.py createsuperuser
   ```

2. قم بتشغيل الخادم:
   ```bash
   python manage.py runserver
   ```

3. انتقل إلى: `http://localhost:8000/admin`

### خطوات إضافة البيانات الأساسية

1. **إضافة المستخدمين**:
   - انتقل إلى قسم "Users"
   - أضف مستخدمين بأدوار مختلفة:
     - عميل (customer)
     - مالك متجر (store_owner)
     - مدير (admin)

2. **إضافة التصنيفات والعلامات التجارية**:
   - أضف تصنيفات المنتجات
   - أضف العلامات التجارية الشائعة

3. **إضافة المتاجر**:
   - اربط كل متجر بمالك متجر
   - أضف معلومات المتجر الأساسية

4. **إضافة المنتجات**:
   - اربط المنتجات بالمتاجر والتصنيفات
   - أضف الصور والمواصفات

## استخدام Django Fixtures

### ملف Categories & Brands
`categories_brands.json`:
```json
[
  {
    "model": "products.category",
    "pk": 1,
    "fields": {
      "name": "الإلكترونيات",
      "slug": "electronics",
      "description": "الأجهزة الإلكترونية وملحقاتها",
      "is_active": true,
      "sort_order": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  },
  {
    "model": "products.brand",
    "pk": 1,
    "fields": {
      "name": "سامسونج",
      "slug": "samsung",
      "description": "منتجات سامسونج الإلكترونية",
      "website": "https://www.samsung.com",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
]
```

### ملف Users & Stores
`users_stores.json`:
```json
[
  {
    "model": "auth_app.user",
    "pk": 1,
    "fields": {
      "password": "pbkdf2_sha256$600000$...",
      "username": "store_owner1",
      "email": "owner1@example.com",
      "is_active": true,
      "role": "store_owner",
      "date_joined": "2024-01-01T00:00:00Z"
    }
  },
  {
    "model": "products.store",
    "pk": 1,
    "fields": {
      "owner": 1,
      "name": "متجر الإلكترونيات الحديثة",
      "slug": "modern-electronics",
      "email": "store@example.com",
      "phone": "1234567890",
      "address": "شارع الرياض الرئيسي",
      "is_active": true,
      "is_verified": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  }
]
```

### تحميل البيانات
```bash
python manage.py loaddata categories_brands.json
python manage.py loaddata users_stores.json
```

## سكربت إدارة Django المخصص

### إنشاء السكربت
أنشئ ملف `products/management/commands/populate_test_data.py`:

```python
"""
سكربت لتوليد بيانات اختبار شاملة للنظام.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from faker import Faker
import random
from datetime import timedelta

from products.models import Category, Brand, Store, Product
from comments.models import Comment, AISentimentAnalysisResult
from ai_models.models import UserBehaviorLog, AIModelPerformance

User = get_user_model()
fake = Faker(['ar_SA', 'en_US'])

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

    def handle(self, *args, **options):
        self.stdout.write('بدء توليد البيانات...')
        
        # توليد المستخدمين
        self._create_users(options['users'])
        
        # توليد المتاجر والمنتجات
        self._create_stores_and_products(options['products'])
        
        # توليد التفاعلات وسلوك المستخدمين
        self._create_user_behavior()
        
        # توليد التعليقات وتحليل المشاعر
        self._create_comments_and_sentiment()
        
        # توليد بيانات أداء نماذج الذكاء الاصطناعي
        self._create_ai_performance_data()
        
        self.stdout.write(self.style.SUCCESS('تم توليد البيانات بنجاح!'))

    def _create_users(self, count):
        """توليد مستخدمين متنوعين"""
        roles = ['customer', 'store_owner', 'admin']
        weights = [0.7, 0.25, 0.05]  # نسب توزيع الأدوار
        
        for i in range(count):
            role = random.choices(roles, weights=weights)[0]
            User.objects.create_user(
                username=fake.user_name(),
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
        categories = Category.objects.all()
        brands = Brand.objects.all()
        
        for owner in store_owners:
            store = Store.objects.create(
                owner=owner,
                name=fake.company(),
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
                Product.objects.create(
                    store=store,
                    category=random.choice(categories),
                    brand=random.choice(brands),
                    name=fake.product_name(),
                    description=fake.paragraph(),
                    sku=fake.unique.ean13(),
                    price=random.uniform(100, 5000),
                    stock_quantity=random.randint(0, 100),
                    attributes={
                        'color': fake.color_name(),
                        'weight': f"{random.uniform(0.1, 5):.2f} kg",
                        'dimensions': f"{random.randint(10, 50)}x{random.randint(10, 50)}x{random.randint(10, 50)} cm"
                    }
                )

    def _create_user_behavior(self):
        """توليد سجلات سلوك المستخدمين"""
        users = User.objects.filter(role='customer')
        products = Product.objects.all()
        actions = ['view', 'click', 'add_to_cart', 'like', 'search']
        
        for user in users:
            # توليد 10-30 تفاعل لكل مستخدم
            for _ in range(random.randint(10, 30)):
                action = random.choice(actions)
                product = random.choice(products) if action != 'search' else None
                
                metadata = {}
                if action == 'search':
                    metadata['search_query'] = fake.word()
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
        users = User.objects.filter(role='customer')
        products = Product.objects.all()
        
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
            # إنشاء 3-7 تعليقات لكل مستخدم
            for _ in range(random.randint(3, 7)):
                product = random.choice(products)
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
```

### تشغيل السكربت
```bash
# تثبيت المكتبات المطلوبة
pip install faker

# تشغيل السكربت
python manage.py populate_test_data --users 50 --products 100
```

## التحقق من عمل النظام

### البحث الذكي
1. تسجيل الدخول كمستخدم
2. البحث عن منتج مع أخطاء إملائية مقصودة
3. التحقق من:
   - تصحيح الأخطاء الإملائية
   - ظهور نتائج مناسبة
   - اقتراحات البحث

### التوصيات الشخصية
1. تسجيل الدخول كمستخدم
2. تصفح عدة منتجات من نفس الفئة
3. التحقق من:
   - ظهور توصيات مناسبة
   - تحديث التوصيات بناءً على التفاعل

### تحليل المشاعر للتعليقات
1. إضافة تعليق جديد على منتج
2. التحقق من:
   - تصنيف المشاعر (إيجابي/سلبي/محايد)
   - درجة الثقة في التحليل
   - استخراج الكلمات المفتاحية

### مقارنة المنتجات
1. اختيار منتجين للمقارنة
2. التحقق من:
   - عرض نقاط القوة والضعف
   - المقارنة السعرية
   - التحليل الشامل

### نظام QR Code
1. إضافة منتجات للسلة
2. إتمام عملية الشراء
3. التحقق من:
   - إنشاء Master QR Code
   - صلاحية الكود
   - تفاصيل الخصم 