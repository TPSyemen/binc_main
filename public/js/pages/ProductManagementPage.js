import { productService, dashboardService } from "../services/api.js";
import store from "../state/store.js";
import { createElementFromHTML } from "../utils/helpers.js";

export default async function ProductManagementPage() {
  // تعريف الصفحة سيكون فقط في القسم التالي ولا داعي لتعريفها مرتين

  // إزالة الكود المكرر، سيتم تحميل المنتجات عبر initializeProductManagement
/**
 * Product Management Page for Store Owners
 */
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

  // جلب معرف المتجر من الداشبورد بشكل ديناميكي
  let storeId = null;
  let products = [];
  try {
    const myStore = await dashboardService.getMyStore();
    if (!myStore || !myStore.id) {
      const page = createElementFromHTML(`
        <div class="container mx-auto py-8 px-4">
          <h1 class="text-2xl font-bold text-danger mb-4">No Store Found</h1>
          <p class="text-muted">You need to create a store before managing products.</p>
        </div>
      `);
      return page;
    }
    storeId = myStore.id;
    const productsRes = await dashboardService.getStoreProducts(storeId);
    console.log('ProductManagementPage: productsRes', productsRes);
    products = productsRes && Array.isArray(productsRes.results) ? productsRes.results : [];
    console.log('ProductManagementPage: products', products);
  } catch (error) {
    console.error('ProductManagementPage: error fetching products', error);
    products = [];
  }

  let productsHtml = '';
  if (products.length === 0) {
    productsHtml = `<div class="text-center py-8"><p class="text-muted">No products found for this store.</p></div>`;
  } else {
    productsHtml = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b">
              <th class="text-left p-3">Product</th>
              <th class="text-left p-3">Category</th>
              <th class="text-left p-3">Price</th>
              <th class="text-left p-3">Stock</th>
              <th class="text-left p-3">Status</th>
              <th class="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => `
              <tr class="border-b hover:bg-gray-50">
                <td class="p-3">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <i class="fa-solid fa-box text-gray-500"></i>
                    </div>
                    <div>
                      <p class="font-medium">${product.name}</p>
                      <p class="text-sm text-muted">SKU: ${product.sku}</p>
                    </div>
                  </div>
                </td>
                <td class="p-3 text-muted">${product.category_en || product.category_name || 'N/A'}</td>
                <td class="p-3 font-medium">$${product.final_price || '0.00'}</td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded text-xs ${product.stock_quantity > 10 ? 'bg-success text-white' : product.stock_quantity > 0 ? 'bg-warning text-white' : 'bg-danger text-white'}">
                    ${product.stock_quantity || 0} units
                  </span>
                </td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded text-xs ${product.is_active ? 'bg-success text-white' : 'bg-gray-500 text-white'}">
                    ${product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td class="p-3">
                  <div class="flex gap-2">
                        <button class="text-secondary hover:text-blue-600" onclick="editProductSlug('${product.slug ? product.slug : ''}')" title="Edit">
                      <i class="fa-solid fa-edit"></i>
                    </button>
                        <button class="text-primary hover:text-gray-600" onclick="viewProduct('${product.slug ? product.slug : ''}')" title="View">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const page = createElementFromHTML(`
    <div class="container mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-6">Product Management</h1>
      ${productsHtml}
    </div>
  `);

  return page;
}

/**
 * Initialize product management
 */
async function initializeProductManagement(page) {
  try {
    // Setup event listeners
    setupEventListeners(page)
    
    // Load initial data
    await loadProducts(page)
    await loadCategories(page)

  } catch (error) {
    console.error('Product management initialization error:', error)
    showProductsError(page, error)
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners(page) {
  // Add product button
  const addProductBtn = page.querySelector('#add-product-btn');
  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      location.hash = '#/products/add';
    });
  } else {
    console.warn('setupEventListeners: #add-product-btn not found');
  }

  // Search and filters
  const searchInput = page.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      loadProducts(page);
    }, 300));
  } else {
    console.warn('setupEventListeners: #search-input not found');
  }

  const categoryFilter = page.querySelector('#category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      loadProducts(page);
    });
  } else {
    console.warn('setupEventListeners: #category-filter not found');
  }

  const statusFilter = page.querySelector('#status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadProducts(page);
    });
  } else {
    console.warn('setupEventListeners: #status-filter not found');
  }

  const stockFilter = page.querySelector('#stock-filter');
  if (stockFilter) {
    stockFilter.addEventListener('change', () => {
      loadProducts(page);
    });
  } else {
    console.warn('setupEventListeners: #stock-filter not found');
  }

  // Select all checkbox
  const selectAll = page.querySelector('#select-all');
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      const checkboxes = page.querySelectorAll('input[name="product-select"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
      });
      updateBulkActionsButton(page);
    });
  } else {
    console.warn('setupEventListeners: #select-all not found');
  }

  // Retry button
  const retryProducts = page.querySelector('#retry-products');
  if (retryProducts) {
    retryProducts.addEventListener('click', () => {
      loadProducts(page);
    });
  } else {
    console.warn('setupEventListeners: #retry-products not found');
  }

  // Modal close
  page.querySelector('#close-modal').addEventListener('click', () => {
    page.querySelector('#product-modal').classList.add('hidden')
  })

  // Export button
  page.querySelector('#export-btn').addEventListener('click', () => {
    exportProducts()
  })
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Update bulk actions button state
 */
function updateBulkActionsButton(page) {
  const selectedCheckboxes = page.querySelectorAll('input[name="product-select"]:checked')
  const bulkActionsBtn = page.querySelector('#bulk-actions-btn')
  
  if (selectedCheckboxes.length > 0) {
    bulkActionsBtn.disabled = false
    bulkActionsBtn.textContent = `Bulk Actions (${selectedCheckboxes.length})`
  } else {
    bulkActionsBtn.disabled = true
    bulkActionsBtn.textContent = 'Bulk Actions'
  }
}

// Global functions
window.addNewProduct = function() {
  location.hash = '#/products/add'
}

window.exportProducts = function() {
  showToast("Export feature coming soon!", "info")
}

/**
 * Load products from backend
 */
async function loadProducts(page) {
  try {
    // Show loading state
    page.querySelector('#products-loading').classList.remove('hidden')
    page.querySelector('#products-table').classList.add('hidden')
    page.querySelector('#products-empty').classList.add('hidden')
    page.querySelector('#products-error').classList.add('hidden')

    // Get filter values
    const search = page.querySelector('#search-input').value
    const category = page.querySelector('#category-filter').value
    const status = page.querySelector('#status-filter').value
    const stock = page.querySelector('#stock-filter').value

    // For now, assume store ID is 1 (in real app, get from user's store)
    const storeId = 1

    console.log('Loading products for store:', storeId)
    const products = await dashboardService.getStoreProducts(storeId)
    console.log('Loaded products:', products)

    // Hide loading state
    page.querySelector('#products-loading').classList.add('hidden')

    if (!products || products.length === 0) {
      page.querySelector('#products-empty').classList.remove('hidden')
      return
    }

    // Filter products based on search and filters
    let filteredProducts = products

    if (search) {
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (category) {
      filteredProducts = filteredProducts.filter(product =>
        product.category_name === category
      )
    }

    if (status) {
      filteredProducts = filteredProducts.filter(product =>
        status === 'active' ? product.is_active : !product.is_active
      )
    }

    if (stock) {
      filteredProducts = filteredProducts.filter(product => {
        if (stock === 'in_stock') return product.in_stock && product.stock_quantity > 0
        if (stock === 'out_of_stock') return !product.in_stock || product.stock_quantity === 0
        if (stock === 'low_stock') return product.stock_quantity > 0 && product.stock_quantity <= 10
        return true
      })
    }

    // Render products table
    renderProductsTable(page, filteredProducts)

    // Show table
    page.querySelector('#products-table').classList.remove('hidden')

  } catch (error) {
    console.error('Error loading products:', error)
    showProductsError(page, error)
  }
}

/**
 * Render products table
 */
function renderProductsTable(page, products) {
  const tbody = page.querySelector('#products-tbody')

  tbody.innerHTML = products.map(product => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-3">
        <input type="checkbox" name="product-select" value="${product.id}" class="rounded">
      </td>
      <td class="p-3">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
            <i class="fa-solid fa-box text-gray-500"></i>
          </div>
          <div>
            <p class="font-medium">${product.name}</p>
            <p class="text-sm text-muted">SKU: ${product.sku}</p>
          </div>
        </div>
      </td>
      <td class="p-3 text-muted">${product.category_name || 'N/A'}</td>
      <td class="p-3">
        <div>
          <span class="font-medium">$${product.final_price}</span>
          ${product.discount_percentage > 0 ? `
            <div class="text-xs text-muted">
              <span class="line-through">$${product.price}</span>
              <span class="text-success">${product.discount_percentage}% off</span>
            </div>
          ` : ''}
        </div>
      </td>
      <td class="p-3">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 rounded text-xs ${getStockStatusClass(product)}">
            ${product.stock_quantity} units
          </span>
          <button onclick="toggleProductStock('${product.id}')"
                  class="text-sm ${product.in_stock ? 'text-success' : 'text-danger'}"
                  title="${product.in_stock ? 'Mark as out of stock' : 'Mark as in stock'}">
            <i class="fa-solid fa-toggle-${product.in_stock ? 'on' : 'off'}"></i>
          </button>
        </div>
      </td>
      <td class="p-3">
        <span class="px-2 py-1 rounded text-xs ${product.is_active ? 'bg-success text-white' : 'bg-gray-500 text-white'}">
          ${product.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="p-3">
        <div class="flex items-center gap-1">
          <span class="text-warning">
            ${renderStars(product.average_rating || 0)}
          </span>
          <span class="text-sm text-muted">(${product.total_reviews || 0})</span>
        </div>
      </td>
      <td class="p-3">
        <div class="flex gap-2">
          <button onclick="editProduct('${product.slug}')"
                  class="text-secondary hover:text-blue-600"
                  title="Edit Product">
            <i class="fa-solid fa-edit"></i>
          </button>
          <button onclick="viewProduct('${product.id}')"
                  class="text-primary hover:text-gray-600"
                  title="View Product">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button onclick="duplicateProduct('${product.id}')"
                  class="text-success hover:text-green-600"
                  title="Duplicate Product">
            <i class="fa-solid fa-copy"></i>
          </button>
          <button onclick="showProductActions('${product.id}')"
                  class="text-muted hover:text-gray-600"
                  title="More Actions">
            <i class="fa-solid fa-ellipsis-v"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('')

  // Add event listeners for checkboxes
  const checkboxes = tbody.querySelectorAll('input[name="product-select"]')
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateBulkActionsButton(page)
    })
  })
}

/**
 * Get stock status CSS class
 */
function getStockStatusClass(product) {
  if (!product.in_stock || product.stock_quantity === 0) {
    return 'bg-danger text-white'
  } else if (product.stock_quantity <= 10) {
    return 'bg-warning text-white'
  } else {
    return 'bg-success text-white'
  }
}

/**
 * Render star rating
 */
function renderStars(rating) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return '★'.repeat(fullStars) +
         (hasHalfStar ? '☆' : '') +
         '☆'.repeat(emptyStars)
}

/**
 * Load categories for filter
 */
async function loadCategories(page) {
  try {
    const categories = await productService.getCategories()
    const categorySelect = page.querySelector('#category-filter')

    categories.forEach(category => {
      const option = document.createElement('option')
      option.value = category.name
      option.textContent = category.name
      categorySelect.appendChild(option)
    })
  } catch (error) {
    console.error('Error loading categories:', error)
  }
}

/**
 * Show products error
 */
function showProductsError(page, error) {
  page.querySelector('#products-loading').classList.add('hidden')
  page.querySelector('#products-table').classList.add('hidden')
  page.querySelector('#products-empty').classList.add('hidden')
  page.querySelector('#products-error').classList.remove('hidden')
}

// Global product action functions
window.editProductSlug = async function(slugOrId) {
  if (!slugOrId) {
    alert('لا يوجد slug لهذا المنتج!');
    return;
  }
  // إذا كان المدخل رقمًا، حاول إيجاد المنتج في قائمة المنتجات أولاً
  if (!isNaN(slugOrId)) {
    // ابحث في قائمة المنتجات المحملة مسبقاً
    if (window.products && Array.isArray(window.products)) {
      const found = window.products.find(p => p.id == slugOrId);
      if (found && found.slug) {
        location.hash = `#/products/edit/${found.slug}`;
        return;
      }
    }
    // إذا لم يوجد المنتج محلياً، جلبه من الباك
    try {
      const { productService } = await import('../services/api.js');
      const product = await productService.getProductById(slugOrId);
      if (product.slug) {
        location.hash = `#/products/edit/${product.slug}`;
        return;
      }
    } catch (error) {
      alert('تعذر جلب المنتج أو السلق من الباك');
      return;
    }
  }
  location.hash = `#/products/edit/${slugOrId}`;
}

window.viewProduct = function(slugOrId) {
  location.hash = `#/products/${slugOrId}`
}

window.duplicateProduct = function(productId) {
  showToast("Duplicate product feature coming soon!", "info")
}

window.toggleProductStock = async function(productId) {
  try {
    const result = await dashboardService.toggleProductStock(productId)
    showToast(result.message, 'success')
    // Reload products to show updated status
    const page = document.querySelector('.container')
    loadProducts(page)
  } catch (error) {
    console.error('Error toggling stock:', error)
    showToast('Failed to update stock status', 'error')
  }
}

window.showProductActions = function(productId) {
  showToast("More product actions coming soon!", "info")
}
