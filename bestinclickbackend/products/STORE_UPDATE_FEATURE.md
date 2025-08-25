# خاصية تعديل معلومات المتجر للمالك

## نظرة عامة
تم إضافة خاصية جديدة تسمح لمالكي المتاجر بتعديل معلومات متاجرهم بشكل آمن ومحدود، حيث كل مالك يستطيع تعديل متجره فقط.

## الملفات المُضافة/المُعدلة

### 1. Serializers (`products/serializers.py`)
- **إضافة**: `StoreUpdateSerializer` - serializer مخصص لتعديل معلومات المتجر
- **المميزات**:
  - التحقق من صحة البيانات
  - التأكد من عدم تكرار الأسماء والإيميلات
  - التحقق من صحة رقم الهاتف
  - رسائل خطأ باللغة العربية

### 2. Views (`products/views.py`)
- **إضافة**: `StoreUpdateView` - view لتعديل معلومات المتجر
- **إضافة**: `my_store` - function-based view لجلب معلومات متجر المستخدم الحالي
- **المميزات**:
  - حماية بالـ permissions
  - إعادة توليد الـ slug عند تغيير الاسم
  - دعم GET و PUT/PATCH
  - معالجة الأخطاء

### 3. Permissions (`products/permissions.py`)
- **إضافة**: `IsStoreOwnerOfStore` - permission مخصص للتأكد من أن المالك يعدل متجره فقط
- **المميزات**:
  - التحقق من الهوية والدور
  - التحقق من ملكية المتجر
  - دعم القراءة للجميع والكتابة للمالك فقط

### 4. URLs (`products/urls.py`)
- **إضافة**: `stores/my-store/` - endpoint لجلب معلومات المتجر الخاص بالمستخدم
- **إضافة**: `stores/<slug>/update/` - endpoint لتعديل معلومات المتجر

### 5. ملفات الاختبار والتوثيق
- `test_store_update.py` - اختبارات شاملة للخاصية الجديدة
- `STORE_UPDATE_API.md` - توثيق مفصل للـ API
- `store_update_example.js` - أمثلة JavaScript للاستخدام
- `store_update_form.html` - نموذج HTML كامل للتعديل

## الـ Endpoints الجديدة

### 1. جلب معلومات المتجر الخاص بالمستخدم
```
GET /api/products/stores/my-store/
```
- **المصادقة**: مطلوبة (مالك متجر فقط)
- **الاستجابة**: معلومات المتجر كاملة

### 2. تعديل معلومات المتجر
```
GET/PUT/PATCH /api/products/stores/{slug}/update/
```
- **المصادقة**: مطلوبة (مالك المتجر فقط)
- **GET**: جلب معلومات المتجر للتعديل
- **PUT/PATCH**: تحديث معلومات المتجر

## الحقول القابلة للتعديل

### الحقول المطلوبة
- `name` - اسم المتجر
- `email` - البريد الإلكتروني
- `phone` - رقم الهاتف
- `address` - العنوان

### الحقول الاختيارية
- `description` - وصف المتجر
- `logo` - شعار المتجر
- `banner` - صورة الغلاف

## قواعد التحقق

### اسم المتجر
- لا يمكن أن يكون فارغاً
- يجب أن يكون فريداً عبر جميع المتاجر
- يتم إعادة توليد الـ slug تلقائياً عند التغيير

### البريد الإلكتروني
- يجب أن يكون بصيغة صحيحة
- يجب أن يكون فريداً عبر جميع المتاجر

### رقم الهاتف
- يجب أن يكون بصيغة صحيحة
- يدعم الأرقام الدولية

### العنوان
- لا يمكن أن يكون فارغاً

## الأمان والحماية

### 1. المصادقة والتخويل
- يجب أن يكون المستخدم مسجل دخول
- يجب أن يكون دوره "store_owner"
- يمكن للمالك تعديل متجره فقط

### 2. التحقق من البيانات
- جميع البيانات يتم التحقق منها قبل الحفظ
- رسائل خطأ واضحة باللغة العربية
- منع تكرار البيانات الحساسة

### 3. معالجة الأخطاء
- معالجة شاملة للأخطاء
- رسائل خطأ مفيدة للمطور والمستخدم
- تسجيل الأخطاء في الـ logs

## أمثلة الاستخدام

### JavaScript/Frontend
```javascript
// جلب معلومات المتجر
const store = await storeAPI.getMyStore();

// تحديث معلومات المتجر
const updatedStore = await storeAPI.updateStore(store.slug, {
    name: 'اسم المتجر الجديد',
    email: 'new@example.com',
    phone: '+966501234567',
    address: 'العنوان الجديد'
});
```

### Python/Backend
```python
# في Django view أو script
from products.models import Store
from products.serializers import StoreUpdateSerializer

# جلب متجر المستخدم
store = Store.objects.get(owner=request.user)

# تحديث المتجر
serializer = StoreUpdateSerializer(store, data=update_data, partial=True)
if serializer.is_valid():
    serializer.save()
```

## الاختبارات

تم إنشاء اختبارات شاملة تغطي:
- تعديل المتجر بواسطة المالك
- منع العملاء من التعديل
- منع المستخدمين غير المسجلين من التعديل
- التحقق من صحة البيانات
- endpoint الخاص بجلب معلومات المتجر

## التشغيل والاختبار

### 1. تشغيل الاختبارات
```bash
python manage.py test products.test_store_update
```

### 2. فحص النظام
```bash
python manage.py check
```

### 3. تشغيل الخادم
```bash
python manage.py runserver
```

## ملاحظات مهمة

1. **الـ Slug**: يتم إعادة توليده تلقائياً عند تغيير اسم المتجر
2. **الصور**: يدعم رفع الصور عبر FormData أو base64
3. **التحديث الجزئي**: يدعم PATCH للتحديث الجزئي
4. **اللغة**: جميع رسائل الخطأ باللغة العربية
5. **الأداء**: استخدام select_related و prefetch_related لتحسين الأداء

## المتطلبات

- Django REST Framework
- Django
- Python 3.8+
- المصادقة عبر JWT أو Session

## الدعم والصيانة

- جميع الأخطاء يتم تسجيلها في Django logs
- يمكن مراقبة الأداء عبر Django admin
- يدعم التوسع المستقبلي لإضافة حقول جديدة