import { createElementFromHTML, showToast } from "../utils/helpers.js?v=2024"
import { dashboardService, productService } from "../services/api.js"
import store from "../state/store.js"

/**
 * Product Add/Edit Form Page for Store Owners
 */
export default function ProductFormPage(productId = null) {
  const { user } = store.getState()
  // إذا كان هناك معرف، اعتبره slug وليس id
  const productSlug = productId
  const isEdit = !!productSlug
  
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
    <div class="container mx-auto py-8 px-4">
      <div class="flex items-center gap-4 mb-8">
        <button id="back-btn" class="text-muted hover:text-primary">
          <i class="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div>
          <h1 class="text-4xl font-extrabold mb-2">${isEdit ? 'Edit Product' : 'Add New Product'}</h1>
          <p class="text-muted">${isEdit ? 'Update your product information' : 'Add a new product to your store'}</p>
        </div>
      </div>

      <!-- Loading State -->
      <div id="form-loading" class="text-center py-8 ${isEdit ? '' : 'hidden'}">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
        <p class="mt-2 text-muted">Loading product data...</p>
      </div>

      <!-- Product Form -->
      <form id="product-form" class="max-w-4xl mx-auto ${isEdit ? 'hidden' : ''}">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Main Product Information -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Basic Information -->
            <div class="card">
              <h2 class="text-xl font-bold mb-4">Basic Information</h2>
              <div class="space-y-4">
                <div>
                  <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input type="text" id="name" name="name" required class="input-field" placeholder="Enter product name">
                  <p class="text-xs text-muted mt-1">Choose a clear, descriptive name for your product</p>
                </div>

                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea id="description" name="description" required rows="4" class="input-field" placeholder="Describe your product in detail"></textarea>
                  <p class="text-xs text-muted mt-1">Provide detailed information about features, benefits, and specifications</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label for="category" class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select id="category" name="category" required class="input-field">
                      <option value="">Select Category</option>
                    </select>
                  </div>
                  <div>
                    <label for="brand" class="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                    <select id="brand" name="brand" required class="input-field">
                      <option value="">Select Brand</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label for="sku" class="block text-sm font-medium text-gray-700 mb-1">SKU (Stock Keeping Unit) *</label>
                  <input type="text" id="sku" name="sku" required class="input-field" placeholder="e.g., PROD-001">
                  <p class="text-xs text-muted mt-1">Unique identifier for inventory tracking</p>
                </div>
              </div>
            </div>

            <!-- Pricing -->
            <div class="card">
              <h2 class="text-xl font-bold mb-4">Pricing</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="price" class="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input type="number" id="price" name="price" required step="0.01" min="0" class="input-field pl-8" placeholder="0.00">
                  </div>
                </div>
                <div>
                  <label for="discount_percentage" class="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input type="number" id="discount_percentage" name="discount_percentage" step="0.01" min="0" max="100" class="input-field" placeholder="0">
                </div>
              </div>
              <div id="final-price-display" class="mt-2 p-3 bg-gray-50 rounded">
                <p class="text-sm"><strong>Final Price:</strong> <span id="final-price">$0.00</span></p>
              </div>
            </div>

            <!-- Inventory -->
            <div class="card">
              <h2 class="text-xl font-bold mb-4">Inventory</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="stock_quantity" class="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                  <input type="number" id="stock_quantity" name="stock_quantity" required min="0" class="input-field" placeholder="0">
                </div>
                <div class="flex items-center">
                  <input type="checkbox" id="in_stock" name="in_stock" checked class="rounded mr-2">
                  <label for="in_stock" class="text-sm font-medium text-gray-700">Product is in stock</label>
                </div>
              </div>
            </div>

            <!-- Product Images -->
            <div class="card">
              <h2 class="text-xl font-bold mb-4">Product Images</h2>
              <div>
                <label for="image_urls" class="block text-sm font-medium text-gray-700 mb-1">Image URLs</label>
                <textarea id="image_urls" name="image_urls" rows="3" class="input-field" placeholder="Enter image URLs, one per line"></textarea>
                <p class="text-xs text-muted mt-1">Add URLs of product images, one per line. First image will be the main image.</p>
              </div>
            </div>

            <!-- Product Attributes -->
            <div class="card">
              <h2 class="text-xl font-bold mb-4">Product Attributes</h2>
              <div>
                <label for="attributes" class="block text-sm font-medium text-gray-700 mb-1">Attributes (JSON)</label>
                <textarea id="attributes" name="attributes" rows="4" class="input-field" placeholder='{"color": "Red", "size": "Large", "material": "Cotton"}'></textarea>
                <p class="text-xs text-muted mt-1">Add product specifications in JSON format</p>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Product Status -->
            <div class="card">
              <h3 class="text-lg font-bold mb-4">Product Status</h3>
              <div class="space-y-3">
                <div class="flex items-center">
                  <input type="checkbox" id="is_active" name="is_active" checked class="rounded mr-2">
                  <label for="is_active" class="text-sm font-medium text-gray-700">Active</label>
                </div>
                <div class="flex items-center">
                  <input type="checkbox" id="is_featured" name="is_featured" class="rounded mr-2">
                  <label for="is_featured" class="text-sm font-medium text-gray-700">Featured Product</label>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="card">
              <h3 class="text-lg font-bold mb-4">Actions</h3>
              <div class="space-y-3">
                <button type="submit" id="save-btn" class="btn btn-primary w-full">
                  <i class="fa-solid fa-save mr-2"></i>
                  ${isEdit ? 'Update Product' : 'Save Product'}
                </button>
                <button type="button" id="save-draft-btn" class="btn btn-outline w-full">
                  <i class="fa-solid fa-file-alt mr-2"></i>
                  Save as Draft
                </button>
                <button type="button" id="cancel-btn" class="btn btn-outline w-full">
                  <i class="fa-solid fa-times mr-2"></i>
                  Cancel
                </button>
              </div>
            </div>

            <!-- Preview -->
            <div class="card">
              <h3 class="text-lg font-bold mb-4">Preview</h3>
              <div id="product-preview" class="text-center py-4">
                <div class="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center">
                  <i class="fa-solid fa-image text-gray-400 text-2xl"></i>
                </div>
                <p class="font-medium text-sm">Product Name</p>
                <p class="text-success text-sm">$0.00</p>
              </div>
            </div>
          </div>
        </div>
      </form>

      <!-- Error State -->
      <div id="form-error" class="hidden text-center py-8">
        <div class="text-danger text-4xl mb-4">
          <i class="fa-solid fa-exclamation-triangle"></i>
        </div>
        <h3 class="text-xl font-bold text-danger mb-2">Error Loading Product</h3>
        <p class="text-muted mb-4">Unable to load product data. Please try again.</p>
        <button id="retry-form" class="btn btn-primary">
          <i class="fa-solid fa-refresh mr-2"></i>
          Retry
        </button>
      </div>
    </div>
  `)

  // Initialize the form
  initializeProductForm(page, productId)

  return page
}

/**
 * Initialize product form
 */
async function initializeProductForm(page, productId) {
  try {
    // Setup event listeners
    setupFormEventListeners(page, productId)
    
    // Load categories and brands
    await Promise.all([
      loadCategories(page),
      loadBrands(page)
    ])

    // If editing, load product data
    if (productId) {
      await loadProductData(page, productId)
    }

    // Show form
    page.querySelector('#form-loading').classList.add('hidden')
    page.querySelector('#product-form').classList.remove('hidden')

  } catch (error) {
    console.error('Product form initialization error:', error)
    showFormError(page, error)
  }
}

/**
 * Setup form event listeners
 */
function setupFormEventListeners(page, productId) {
  const form = page.querySelector('#product-form')

  // Back button
  page.querySelector('#back-btn').addEventListener('click', () => {
    history.back()
  })

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    await handleFormSubmit(page, productId)
  })

  // Cancel button
  page.querySelector('#cancel-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      history.back()
    }
  })

  // Save as draft
  page.querySelector('#save-draft-btn').addEventListener('click', async () => {
    await handleFormSubmit(page, productId, true)
  })

  // Price calculation
  const priceInput = page.querySelector('#price')
  const discountInput = page.querySelector('#discount_percentage')

  function updateFinalPrice() {
    const price = parseFloat(priceInput.value) || 0
    const discount = parseFloat(discountInput.value) || 0
    const finalPrice = price * (1 - discount / 100)
    page.querySelector('#final-price').textContent = `$${finalPrice.toFixed(2)}`
  }

  priceInput.addEventListener('input', updateFinalPrice)
  discountInput.addEventListener('input', updateFinalPrice)

  // Product preview update
  const nameInput = page.querySelector('#name')
  nameInput.addEventListener('input', () => {
    page.querySelector('#product-preview p').textContent = nameInput.value || 'Product Name'
  })

  // Retry button
  page.querySelector('#retry-form').addEventListener('click', () => {
    initializeProductForm(page, productId)
  })
}

/**
 * Handle form submission
 */
async function handleFormSubmit(page, productId, isDraft = false) {
  try {
    const form = page.querySelector('#product-form')
    const formData = new FormData(form)

    // Prepare product data
    const productData = {
      name: formData.get('name'),
      description: formData.get('description'),
      sku: formData.get('sku'),
      price: parseFloat(formData.get('price')),
      discount_percentage: parseFloat(formData.get('discount_percentage')) || 0,
      in_stock: formData.has('in_stock'),
      stock_quantity: parseInt(formData.get('stock_quantity')),
      is_active: isDraft ? false : formData.has('is_active'),
      is_featured: formData.has('is_featured'),
      category: parseInt(formData.get('category')),
      brand: parseInt(formData.get('brand')),
      image_urls: formData.get('image_urls').split('\n').filter(url => url.trim()),
      attributes: {}
    }

    // Parse attributes JSON
    try {
      const attributesText = formData.get('attributes')
      if (attributesText) {
        productData.attributes = JSON.parse(attributesText)
      }
    } catch (error) {
      showToast('Invalid JSON format in attributes field', 'error')
      return
    }

    console.log('Submitting product data:', productData)

    // Disable submit button
    const submitBtn = page.querySelector('#save-btn')
    const originalText = submitBtn.innerHTML
    submitBtn.disabled = true
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Saving...'

    let result
    if (productId) {
      // إذا كان المدخل رقم، جلب السلق من الباك
      let productSlug = productId
      if (!isNaN(productId)) {
        try {
          const { productService } = await import('../services/api.js');
          const product = await productService.getProductById(productId);
          if (product.slug) {
            productSlug = product.slug;
          }
        } catch (error) {
          showToast('تعذر جلب السلق من الباك، سيتم استخدام المعرف مباشرة', 'warning');
        }
      }
      // Update existing product
      result = await dashboardService.updateProduct(productSlug, productData)
      showToast('Product updated successfully!', 'success')
    } else {
      // Create new product
      result = await dashboardService.createProduct(productData)
      showToast(`Product ${isDraft ? 'saved as draft' : 'created'} successfully!`, 'success')
    }

    console.log('Product save result:', result)

  // Redirect to product management immediately after success
  location.hash = '#/products-management';

  } catch (error) {
    console.error('Error saving product:', error)
    showToast('Failed to save product. Please check your input and try again.', 'error')

    // Re-enable submit button
    const submitBtn = page.querySelector('#save-btn')
    submitBtn.disabled = false
    submitBtn.innerHTML = productId ? 'Update Product' : 'Save Product'
  }
}

/**
 * Load categories
 */
async function loadCategories(page) {
  try {
    let categories = await productService.getCategories();
    // إذا كانت الاستجابة كائن فيه results، استخدمها
    if (categories && typeof categories === 'object' && Array.isArray(categories.results)) {
      categories = categories.results;
    }
    const categorySelect = page.querySelector('#category');

    if (!Array.isArray(categories)) {
      throw new Error('Categories response is not an array');
    }

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    showToast('Failed to load categories', 'error');
  }
}

/**
 * Load brands
 */
async function loadBrands(page) {
  try {
    let brands = await productService.getBrands();
    // إذا كانت الاستجابة كائن فيه results، استخدمها
    if (brands && typeof brands === 'object' && Array.isArray(brands.results)) {
      brands = brands.results;
    }
    const brandSelect = page.querySelector('#brand');

    if (!Array.isArray(brands)) {
      throw new Error('Brands response is not an array');
    }

    brands.forEach(brand => {
      const option = document.createElement('option');
      option.value = brand.id;
      option.textContent = brand.name;
      brandSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading brands:', error);
    showToast('Failed to load brands', 'error');
  }
}

/**
 * Load product data for editing
 */
async function loadProductData(page, productId) {
  try {
    // استخدم السلق دائماً لجلب المنتج
    const product = await productService.getProductById(productId)
    console.log('Loaded product for editing:', product)

    if (!product || product.detail === 'No Product matches the given query' || product.message === 'No Product matches the given query') {
      page.querySelector('#form-loading').classList.add('hidden')
      page.querySelector('#product-form').classList.add('hidden')
      page.querySelector('#form-error').classList.remove('hidden')
      page.querySelector('#form-error h3').textContent = 'Product Not Found'
      page.querySelector('#form-error p').textContent = 'The product you are trying to edit does not exist. Please check the product ID or create a new product.'
      return;
    }

    // Populate form fields
    page.querySelector('#name').value = product.name || ''
    page.querySelector('#description').value = product.description || ''
    page.querySelector('#sku').value = product.sku || ''
    page.querySelector('#price').value = product.price || ''
    page.querySelector('#discount_percentage').value = product.discount_percentage || ''
    page.querySelector('#stock_quantity').value = product.stock_quantity || ''
    page.querySelector('#in_stock').checked = product.in_stock
    page.querySelector('#is_active').checked = product.is_active
    page.querySelector('#is_featured').checked = product.is_featured
    page.querySelector('#category').value = product.category?.id || ''
    page.querySelector('#brand').value = product.brand?.id || ''

    // Handle image URLs
    if (product.image_urls && product.image_urls.length > 0) {
      page.querySelector('#image_urls').value = product.image_urls.join('\n')
    }

    // Handle attributes
    if (product.attributes && Object.keys(product.attributes).length > 0) {
      page.querySelector('#attributes').value = JSON.stringify(product.attributes, null, 2)
    }

    // Update preview
    page.querySelector('#product-preview p').textContent = product.name || 'Product Name'

    // Update final price
    const price = parseFloat(product.price) || 0
    const discount = parseFloat(product.discount_percentage) || 0
    const finalPrice = price * (1 - discount / 100)
    page.querySelector('#final-price').textContent = `$${finalPrice.toFixed(2)}`

  } catch (error) {
    console.error('Error loading product data:', error)
    page.querySelector('#form-loading').classList.add('hidden')
    page.querySelector('#product-form').classList.add('hidden')
    page.querySelector('#form-error').classList.remove('hidden')
    page.querySelector('#form-error h3').textContent = 'Product Not Found'
    page.querySelector('#form-error p').textContent = 'The product you are trying to edit does not exist. Please check the product ID or create a new product.'
  }
}

/**
 * Show form error
 */
function showFormError(page, error) {
  page.querySelector('#form-loading').classList.add('hidden')
  page.querySelector('#product-form').classList.add('hidden')
  page.querySelector('#form-error').classList.remove('hidden')
}
