import { createElementFromHTML, showToast } from "../utils/helpers.js?v=2024"
import store from "../state/store.js"
import { productService } from "../services/api.js"

/**
 * صفحة إنشاء متجر جديد
 */
export default function CreateStorePage() {
  const { user } = store.getState()
  if (!user || user.role !== 'store_owner') {
    return createElementFromHTML(`
      <div class="container mx-auto py-8 px-4">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-danger mb-4">Access Denied</h1>
          <p class="text-muted">You must be a store owner to access this page.</p>
        </div>
      </div>
    `)
  }

  const page = createElementFromHTML(`
    <div class="container mx-auto py-8 px-4 max-w-lg">
      <h1 class="text-3xl font-extrabold mb-6 text-center">إنشاء متجر جديد</h1>
      <form id="create-store-form" class="space-y-4">
        <div>
          <label class="block mb-1 font-semibold">اسم المتجر</label>
          <input type="text" name="name" class="input input-bordered w-full" required />
        </div>
        <div>
          <label class="block mb-1 font-semibold">البريد الإلكتروني</label>
          <input type="email" name="email" class="input input-bordered w-full" required />
        </div>
        <div>
          <label class="block mb-1 font-semibold">رقم الهاتف</label>
          <input type="text" name="phone" class="input input-bordered w-full" required />
        </div>
        <div>
          <label class="block mb-1 font-semibold">العنوان</label>
          <input type="text" name="address" class="input input-bordered w-full" required />
        </div>
        <button type="submit" class="btn btn-primary w-full">إنشاء المتجر</button>
      </form>
    </div>
  `)

  // ربط النموذج بالباكند
  const form = page.querySelector('#create-store-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(form)
    const data = Object.fromEntries(formData.entries())
    try {
      const result = await productService.createStore(data)
      showToast('تم إنشاء المتجر بنجاح', 'success')
      // إعادة توجيه المستخدم إلى لوحة التحكم أو صفحة المتجر
      location.hash = '#/dashboard'
    } catch (error) {
      showToast('حدث خطأ أثناء إنشاء المتجر', 'error')
      console.error('Create store error:', error)
    }
  })

  return page
}

// ملاحظة: يجب ربط هذا النموذج مع API الباكند لإنشاء المتجر فعلياً عند الضغط على زر "إنشاء المتجر".
// يمكن إضافة منطق الإرسال والمعالجة لاحقاً حسب تفاصيل الباكند.
