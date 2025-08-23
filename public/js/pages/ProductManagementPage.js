import { productService, dashboardService } from "../services/api.js";
import store from "../state/store.js";
import { createElementFromHTML, showToast } from "../utils/helpers.js";

export default async function ProductManagementPage() {
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

  // Get store information 
  let storeId = null;
  let storeName = '';
  try {
    const myStore = await dashboardService.getMyStore();
    if (!myStore || !myStore.id) {
      return createElementFromHTML(`
        <div class="container mx-auto py-8 px-4">
          <h1 class="text-2xl font-bold text-danger mb-4">No Store Found</h1>
          <p class="text-muted">You need to create a store before managing products.</p>
          <a href="#/create-store" class="btn btn-primary mt-4">Create Store</a>
        </div>
      `);
    }
    storeId = myStore.id;
    storeName = myStore.name;
  } catch (error) {
    console.error('ProductManagementPage: error fetching store info', error);
    return createElementFromHTML(`
      <div class="container mx-auto py-8 px-4">
        <h1 class="text-2xl font-bold text-danger mb-4">Error Loading Store</h1>
        <p class="text-muted">Failed to load store information. Please try again.</p>
      </div>
    `);
  }

  const page = createElementFromHTML(`
    <div class="container mx-auto py-8 px-4">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-primary mb-2">Product Management</h1>
          <p class="text-muted">Manage products for <span class="font-semibold text-secondary">${storeName}</span></p>
        </div>
        <div class="flex gap-3 mt-4 lg:mt-0">
          <button class="btn btn-outline" id="export-btn">
            <i class="fa-solid fa-download mr-2"></i>
            Export
          </button>
          <button class="btn btn-primary" id="add-product-btn">
            <i class="fa-solid fa-plus mr-2"></i>
            Add Product
          </button>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
            <div class="relative">
              <input type="search" 
                     placeholder="Search by name or SKU..." 
                     class="input-field pl-10" 
                     id="search-input">
              <i class="fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select class="input-field" id="category-filter">
              <option value="">All Categories</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select class="input-field" id="status-filter">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <!-- Stock Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
            <select class="input-field" id="stock-filter">
              <option value="">All Stock</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        <!-- Clear Filters -->
        <div class="mt-4 flex justify-end">
          <button class="btn btn-outline" id="clear-filters">
            <i class="fa-solid fa-refresh mr-2"></i>
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Products Table -->
      <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <!-- Table Header -->
        <div class="p-6 border-b bg-gray-50">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div class="flex items-center gap-4">
              <input type="checkbox" id="select-all" class="rounded">
              <span class="text-sm font-medium text-gray-700">Select All</span>
            </div>
            <div class="flex items-center gap-3">
              <button class="btn btn-outline btn-sm" id="bulk-actions-btn" disabled>
                Bulk Actions
              </button>
              <span class="text-sm text-gray-500" id="products-count">0 products</span>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div id="products-loading" class="p-8 text-center">
          <div class="loader w-8 h-8 border-4 border-gray-200 border-t-secondary rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-gray-500">Loading products...</p>
        </div>

        <!-- Products Table -->
        <div id="products-table" class="hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 border-b">
                <tr>
                  <th class="text-left p-4 w-12"></th>
                  <th class="text-left p-4">Product</th>
                  <th class="text-left p-4">Category</th>
                  <th class="text-left p-4">Price</th>
                  <th class="text-left p-4">Stock</th>
                  <th class="text-left p-4">Status</th>
                  <th class="text-left p-4">Rating</th>
                  <th class="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody id="products-tbody">
                <!-- Products will be inserted here -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Empty State -->
        <div id="products-empty" class="hidden p-8 text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-box text-gray-400 text-2xl"></i>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p class="text-gray-500 mb-4">Get started by adding your first product.</p>
          <button class="btn btn-primary" onclick="addNewProduct()">
            <i class="fa-solid fa-plus mr-2"></i>
            Add Product
          </button>
        </div>

        <!-- Error State -->
        <div id="products-error" class="hidden p-8 text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-exclamation-triangle text-red-500 text-2xl"></i>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Failed to load products</h3>
          <p class="text-gray-500 mb-4">There was an error loading your products.</p>
          <button class="btn btn-primary" id="retry-products">
            <i class="fa-solid fa-refresh mr-2"></i>
            Try Again
          </button>
        </div>
      </div>
    </div>

    <!-- Product Modal (for quick view/edit) -->
    <div id="product-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Product Details</h3>
            <button class="text-gray-400 hover:text-gray-600" id="close-modal">
              <i class="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
        <div class="p-6" id="modal-content">
          <!-- Modal content will be inserted here -->
        </div>
      </div>
    </div>
  `);

  // Save storeId for later reloads
  page.dataset.storeId = storeId;
  const container = document.getElementById('page-container');
  if (container) container.dataset.storeId = storeId;

  // Initialize the page
  await initializeProductManagement(page, storeId);

  return page;
}

/**
 * Initialize product management
 */
async function initializeProductManagement(page, storeId) {
  try {
    // Setup event listeners
    setupEventListeners(page, storeId)
    
    // Load initial data
    await loadProducts(page, storeId)
    await loadCategories(page)

  } catch (error) {
    console.error('Product management initialization error:', error)
    showProductsError(page, error)
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners(page, storeId) {
  // Add product button
  const addProductBtn = page.querySelector('#add-product-btn');
  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      location.hash = '#/products/add';
    });
  }

  // Search input
  const searchInput = page.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      loadProducts(page, storeId);
    }, 300));
  }

  // Filter selects
  const categoryFilter = page.querySelector('#category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      loadProducts(page, storeId);
    });
  }

  const statusFilter = page.querySelector('#status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadProducts(page, storeId);
    });
  }

  const stockFilter = page.querySelector('#stock-filter');
  if (stockFilter) {
    stockFilter.addEventListener('change', () => {
      loadProducts(page, storeId);
    });
  }

  // Clear filters
  const clearFilters = page.querySelector('#clear-filters');
  if (clearFilters) {
    clearFilters.addEventListener('click', () => {
      searchInput.value = '';
      categoryFilter.value = '';
      statusFilter.value = '';
      stockFilter.value = '';
      loadProducts(page, storeId);
    });
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
  }

  // Retry button
  const retryProducts = page.querySelector('#retry-products');
  if (retryProducts) {
    retryProducts.addEventListener('click', () => {
      loadProducts(page, storeId);
    });
  }

  // Modal close
  const closeModal = page.querySelector('#close-modal');
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      page.querySelector('#product-modal').classList.add('hidden')
    });
  }

  // Export button
  const exportBtn = page.querySelector('#export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportProducts()
    });
  }
}

/**
 * Load products from backend
 */
async function loadProducts(page, storeId) {
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

    console.log('Loading products for store:', storeId)
    const productsRes = await dashboardService.getStoreProducts(storeId)
    let products = productsRes && Array.isArray(productsRes.results) ? productsRes.results : []

    console.log('Loaded products:', products)

    // Hide loading state
    page.querySelector('#products-loading').classList.add('hidden')

    if (!products || products.length === 0) {
      page.querySelector('#products-empty').classList.remove('hidden')
      updateProductsCount(page, 0)
      return
    }

    // Apply filters
    let filteredProducts = products

    if (search) {
      filteredProducts = filteredProducts.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(search.toLowerCase()))
      )
    }

    if (category) {
      filteredProducts = filteredProducts.filter(product =>
        product.category_en === category || product.category_name === category
      )
    }

    if (status) {
      filteredProducts = filteredProducts.filter(product =>
        status === 'active' ? product.is_active : !product.is_active
      )
    }

    if (stock) {
      filteredProducts = filteredProducts.filter(product => {
        const stockQuantity = product.stock_quantity || 0
        if (stock === 'in_stock') return stockQuantity > 10
        if (stock === 'low_stock') return stockQuantity > 0 && stockQuantity <= 10
        if (stock === 'out_of_stock') return stockQuantity === 0
        return true
      })
    }

    // Update products count
    updateProductsCount(page, filteredProducts.length)

    if (filteredProducts.length === 0) {
      page.querySelector('#products-empty').classList.remove('hidden')
      return
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
 * Load categories for filter dropdown
 */
async function loadCategories(page) {
  try {
    const categories = await productService.getCategories()
    const categoryFilter = page.querySelector('#category-filter')
    
    let categoriesArray = []
    if (Array.isArray(categories)) {
      categoriesArray = categories
    } else if (categories && Array.isArray(categories.results)) {
      categoriesArray = categories.results
    }

    categoriesArray.forEach(category => {
      const option = document.createElement('option')
      option.value = category.name
      option.textContent = category.name
      categoryFilter.appendChild(option)
    })
  } catch (error) {
    console.error('Error loading categories:', error)
  }
}

/**
 * Render products table
 */
function renderProductsTable(page, products) {
  const tbody = page.querySelector('#products-tbody')

  tbody.innerHTML = products.map(product => `
    <tr class="border-b hover:bg-gray-50">
      <td class="p-4">
        <input type="checkbox" name="product-select" value="${product.id}" class="rounded" onchange="updateBulkActionsButton()">
      </td>
      <td class="p-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
            ${product.image_urls && product.image_urls.length > 0 
              ? `<img src="${product.image_urls[0]}" alt="${product.name}" class="w-full h-full object-cover rounded" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
              : ''
            }
            <i class="fa-solid fa-box text-gray-500 ${product.image_urls && product.image_urls.length > 0 ? 'hidden' : ''}"></i>
          </div>
          <div>
            <p class="font-medium">${product.name}</p>
            <p class="text-sm text-muted">SKU: ${product.sku || 'N/A'}</p>
          </div>
        </div>
      </td>
      <td class="p-4 text-muted">${product.category_en || product.category_name || 'N/A'}</td>
      <td class="p-4">
        <div>
          <span class="font-medium">$${product.final_price || product.price || '0.00'}</span>
          ${(product.discount_percentage || 0) > 0 ? `
            <div class="text-xs text-muted">
              <span class="line-through">$${product.price}</span>
              <span class="text-success">${product.discount_percentage}% off</span>
            </div>
          ` : ''}
        </div>
      </td>
      <td class="p-4">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 rounded text-xs ${getStockStatusClass(product)}">
            ${product.stock_quantity || 0} units
          </span>
        </div>
      </td>
      <td class="p-4">
        <span class="px-2 py-1 rounded text-xs ${product.is_active ? 'bg-success text-white' : 'bg-gray-500 text-white'}">
          ${product.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="p-4">
        <div class="flex items-center gap-1">
          <span class="text-warning">
            ${renderStars(product.average_rating || 0)}
          </span>
          <span class="text-sm text-muted ml-1">(${product.total_reviews || 0})</span>
        </div>
      </td>
      <td class="p-4">
        <div class="flex gap-2">
          <button class="text-secondary hover:text-blue-600" onclick="editProduct('${product.slug || product.id}')" title="Edit">
            <i class="fa-solid fa-edit"></i>
          </button>
          <button class="text-primary hover:text-gray-600" onclick="viewProduct('${product.slug || product.id}')" title="View">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="text-danger hover:text-red-600" onclick="deleteProduct('${product.slug}')" title="Delete">
            <i class="fa-solid fa-trash"></i>
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
  const stock = product.stock_quantity || 0
  if (stock > 10) return 'bg-success text-white'
  if (stock > 0) return 'bg-warning text-white'
  return 'bg-danger text-white'
}

/**
 * Render star rating
 */
function renderStars(rating) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
  
  let stars = ''
  for (let i = 0; i < fullStars; i++) {
    stars += '<i class="fa-solid fa-star"></i>'
  }
  if (hasHalfStar) {
    stars += '<i class="fa-solid fa-star-half-alt"></i>'
  }
  for (let i = 0; i < emptyStars; i++) {
    stars += '<i class="fa-regular fa-star"></i>'
  }
  
  return stars
}

/**
 * Update products count display
 */
function updateProductsCount(page, count) {
  const countElement = page.querySelector('#products-count')
  if (countElement) {
    countElement.textContent = `${count} product${count !== 1 ? 's' : ''}`
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

/**
 * Show products error state
 */
function showProductsError(page, error) {
  page.querySelector('#products-loading').classList.add('hidden')
  page.querySelector('#products-table').classList.add('hidden')
  page.querySelector('#products-empty').classList.add('hidden')
  page.querySelector('#products-error').classList.remove('hidden')
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

// Global functions
window.addNewProduct = function() {
  location.hash = '#/products/add'
}

window.editProduct = function(slug) {
  location.hash = `#/products/edit/${slug}`
}

window.viewProduct = function(slug) {
  location.hash = `#/products/${slug}`
}

window.deleteProduct = function(productId) {
 if (confirm('Are you sure you want to delete this product?')) {
 dashboardService.deleteProduct(productId)
 .then(() => {
 showToast('Product deleted successfully!', 'success')
 // Reload products after deletion
 const page = document.querySelector('#page-container') // Assuming #page-container is the main container for the page
 if (page) {
 const storeId = page.dataset.storeId // Assuming storeId is stored as a data attribute on the page container
 loadProducts(page, storeId)
 }
      }).catch(error => showToast(`Error deleting product: ${error.message}`, 'error'))
  }
}

window.exportProducts = function() {
  showToast("Export feature coming soon!", "info")
}

window.updateBulkActionsButton = function() {
  const page = document.querySelector('#page-container')
  if (page) {
    updateBulkActionsButton(page)
  }
}