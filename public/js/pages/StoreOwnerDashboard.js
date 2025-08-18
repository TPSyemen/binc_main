import { createElementFromHTML, showToast } from "../utils/helpers.js?v=2024"
import { dashboardService, reportsService, promotionsService, productService } from "../services/api.js"
import store from "../state/store.js"

/**
 * Store Owner Dashboard with Real Backend Integration
 */
export default function StoreOwnerDashboard() {
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
    <div class="container mx-auto py-8 px-4">
      <div class="mb-8">
        <h1 class="text-4xl font-extrabold mb-2">Store Owner Dashboard</h1>
        <p class="text-muted">Manage your store, products</p>
      </div>

      <!-- Loading State -->
      <div id="dashboard-loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
        <p class="mt-2 text-muted">Loading dashboard...</p>
      </div>

      <!-- Error State -->
      <div id="dashboard-error" class="hidden text-center py-8">
        <div class="text-danger text-6xl mb-4">
          <i class="fa-solid fa-exclamation-triangle"></i>
        </div>
        <h2 class="text-xl font-bold text-danger mb-2">Dashboard Error</h2>
        <p class="text-muted mb-4">Unable to load dashboard data. Please try again.</p>
        <button id="retry-dashboard" class="btn btn-primary">
          <i class="fa-solid fa-refresh mr-2"></i>
          Retry
        </button>
      </div>

      <!-- Dashboard Content -->
      <div id="dashboard-content" class="hidden">
        <!-- Store Info -->
        <div id="store-info" class="card mb-8">
          <h2 class="text-2xl font-bold mb-4">Store Information</h2>
          <div id="store-details" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Store details will be loaded here -->
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="card text-center">
            <div class="text-3xl font-bold text-secondary mb-2" id="total-products">-</div>
            <p class="text-muted">Total Products</p>
          </div>
          <div class="card text-center">
            <div class="text-3xl font-bold text-warning mb-2" id="avg-rating">-</div>
            <p class="text-muted">Average Rating</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div class="card">
            <h3 class="text-xl font-bold mb-4">Quick Actions</h3>
            <div class="space-y-3">
              <button id="add-product-btn" class="btn btn-primary w-full">
                <i class="fa-solid fa-plus mr-2"></i>
                Add New Product
              </button>
              <button id="generate-report-btn" class="btn btn-outline w-full">
                <i class="fa-solid fa-file-alt mr-2"></i>
                Generate Report
              </button>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card">
            <h3 class="text-xl font-bold mb-4">Recent Activity</h3>
            <div id="recent-activity" class="space-y-3">
              <div class="text-center py-4">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-secondary"></div>
                <p class="mt-2 text-sm text-muted">Loading activity...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Products Overview -->
        <div class="card mb-8">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold">Products Overview</h3>
            <button id="view-all-products-btn" class="btn btn-outline">
              <i class="fa-solid fa-eye mr-2"></i>
              View All Products
            </button>
          </div>
          <div id="products-overview">
            <div class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-secondary"></div>
              <p class="mt-2 text-sm text-muted">Loading products...</p>
            </div>
          </div>
        </div>

        <!-- AI Insights -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4">AI Insights & Recommendations</h3>
          <div id="ai-insights">
            <div class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-secondary"></div>
              <p class="mt-2 text-sm text-muted">Loading AI insights...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `)

  // Initialize dashboard
  checkUserStoreAndInit(page)

  return page
}

/**
 * Check if user has a store, if not redirect to create store, else initialize dashboard
 */
async function checkUserStoreAndInit(page) {
  try {
    // جلب بيانات المتجر الخاص بالمستخدم الحالي
    const myStore = await dashboardService.getMyStore();
    if (!myStore || !myStore.id) {
      showStoreSetupRequired(page);
      return;
    }
    initializeDashboard(page, myStore.id);
  } catch (error) {
    console.error('Error fetching user store:', error);
    showDashboardError(page, error);
  }
}

/**
 * Initialize dashboard with real data
 */
async function initializeDashboard(page, storeId) {
  try {
    // Load all dashboard data
    await Promise.all([
      loadStoreInfo(page, storeId),
      loadDashboardStats(page, storeId),
      loadRecentProducts(page, storeId),
      loadAIInsights(page, storeId)
    ])

    // Setup event listeners
    setupEventListeners(page, storeId)

    // Show dashboard content
    page.querySelector('#dashboard-loading').classList.add('hidden')
    page.querySelector('#dashboard-content').classList.remove('hidden')

  } catch (error) {
    console.error('Dashboard initialization error:', error)
    showDashboardError(page, error)
  }
}

// لم يعد هناك حاجة لدالة getUserStoreId، حيث يتم جلب المعرف من API

/**
 * Show store setup required message
 */
function showStoreSetupRequired(page) {
  page.querySelector('#dashboard-loading').classList.add('hidden')
  page.querySelector('#dashboard-content').innerHTML = `
    <div class="text-center py-12">
      <div class="text-secondary text-6xl mb-4">
        <i class="fa-solid fa-store"></i>
      </div>
      <h2 class="text-2xl font-bold mb-4">Store Setup Required</h2>
      <p class="text-muted mb-6">You need to set up your store before accessing the dashboard.</p>
      <button class="btn btn-primary" onclick="setupStore()">
        <i class="fa-solid fa-plus mr-2"></i>
        Set Up Store
      </button>
    </div>
  `
  page.querySelector('#dashboard-content').classList.remove('hidden')
}

/**
 * Show dashboard error
 */
function showDashboardError(page, error) {
  page.querySelector('#dashboard-loading').classList.add('hidden')
  page.querySelector('#dashboard-error').classList.remove('hidden')
  
  const retryBtn = page.querySelector('#retry-dashboard')
  retryBtn.addEventListener('click', async () => {
    page.querySelector('#dashboard-error').classList.add('hidden')
    page.querySelector('#dashboard-loading').classList.remove('hidden')
    // تحقق مرة أخرى من حالة المتجر عند إعادة المحاولة
    await checkUserStoreAndInit(page)
  })
}

/**
 * Load store information
 */
async function loadStoreInfo(page, storeId) {
  try {
    // جلب بيانات المتجر الحقيقية من API
    const storeInfo = await dashboardService.getMyStore();
    if (!storeInfo || !storeInfo.id) {
      page.querySelector('#store-details').innerHTML = `
        <div class="text-center py-4">
          <p class="text-danger">No store information found</p>
        </div>
      `;
      return;
    }

    const storeDetailsContainer = page.querySelector('#store-details');
    storeDetailsContainer.innerHTML = `
      <div>
        <h4 class="font-semibold mb-2">Store Details</h4>
        <p class="text-sm text-muted mb-1"><strong>Name:</strong> ${storeInfo.name || '-'}</p>
        <p class="text-sm text-muted mb-1"><strong>Email:</strong> ${storeInfo.email || '-'}</p>
        <p class="text-sm text-muted mb-1"><strong>Phone:</strong> ${storeInfo.phone || '-'}</p>
        <p class="text-sm text-muted"><strong>Address:</strong> ${storeInfo.address || '-'}</p>
      </div>
      <div>
        <h4 class="font-semibold mb-2">Store Status</h4>
        <div class="space-y-2">
          <span class="inline-block px-2 py-1 rounded text-xs ${storeInfo.is_verified ? 'bg-success text-white' : 'bg-warning text-white'}">
            ${storeInfo.is_verified ? 'Verified' : 'Pending Verification'}
          </span>
          <span class="inline-block px-2 py-1 rounded text-xs ${storeInfo.is_active ? 'bg-success text-white' : 'bg-danger text-white'}">
            ${storeInfo.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <button class="btn btn-outline mt-3">
          <i class="fa-solid fa-edit mr-2"></i>
          Edit Store Info
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Error loading store info:', error);
    page.querySelector('#store-details').innerHTML = `
      <div class="text-center py-4">
        <p class="text-danger">Failed to load store information</p>
      </div>
    `;
  }
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats(page, storeId) {
  try {
    console.log('Loading dashboard stats for store:', storeId)

    console.log('Performance data:', performance)

    // Get products list for rating calculation
    let productsList = [];
    try {
      const productsRes = await dashboardService.getStoreProducts(storeId);
      productsList = productsRes && Array.isArray(productsRes.results) ? productsRes.results : [];
    } catch (err) {
      console.warn('Could not fetch products for rating calculation:', err);
    }

    // Total products
    const totalProducts = productsList.length;
    page.querySelector('#total-products').textContent = totalProducts;

    // Total orders
    // page.querySelector('#total-orders').textContent = totalOrders;

    // Total reviews (not available yet)
    // يمكنك إضافة عنصر جديد في الواجهة إذا أردت عرض عدد الريفيو
    // مثال: page.querySelector('#total-reviews').textContent = 'Not available yet';

    // Average rating for all products
    let avgRating = 0;
    if (productsList.length > 0) {
      const ratings = productsList.map(p => Number(p.average_rating || p.rating || 0)).filter(r => !isNaN(r));
      if (ratings.length > 0) {
        avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      }
    }
    page.querySelector('#avg-rating').textContent = avgRating.toFixed(1);

    // // Total revenue
    // page.querySelector('#total-revenue').textContent = `$${Number(totalRevenue).toLocaleString()}`;

  } catch (error) {
    console.error('Error loading dashboard stats:', error)

    // Show error state in stats
    page.querySelector('#total-products').textContent = 'Error'
    // page.querySelector('#total-revenue').textContent = 'Error'
    // page.querySelector('#total-orders').textContent = 'Error'
    page.querySelector('#avg-rating').textContent = 'Error'

    showToast('Failed to load dashboard statistics', 'error')
  }
}

/**
 * Load recent products
 */
async function loadRecentProducts(page, storeId) {
  try {
    console.log('Loading recent products for store:', storeId)

    const products = await dashboardService.getStoreProducts(storeId)
    console.log('Products data:', products)

    const productsContainer = page.querySelector('#products-overview');
    const productList = products && Array.isArray(products.results) ? products.results : [];

    if (productList.length === 0) {
      productsContainer.innerHTML = `
        <div class="text-center py-8">
          <div class="text-muted text-4xl mb-4">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <p class="text-muted mb-4">No products found</p>
          <button class="btn btn-primary" onclick="addNewProduct()">
            <i class="fa-solid fa-plus mr-2"></i>
            Add Your First Product
          </button>
        </div>
      `;
      return;
    }

    // Show recent products (limit to 5)
    const recentProducts = productList.slice(0, 5);
    productsContainer.innerHTML = `
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
            ${recentProducts.map(product => `
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
                    <button class="text-secondary hover:text-blue-600" onclick="editProduct('${product.slug || product.id}')" title="Edit">
                      <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="text-primary hover:text-gray-600" onclick="viewProduct('${product.slug || product.id}')" title="View">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="text-warning hover:text-yellow-600" onclick="toggleStock('${product.id}')" title="Toggle Stock">
                      <i class="fa-solid fa-toggle-${product.in_stock ? 'on' : 'off'}"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (error) {
    console.error('Error loading recent products:', error)
    page.querySelector('#products-overview').innerHTML = `
      <div class="text-center py-8">
        <p class="text-danger">Failed to load products</p>
        <button class="btn btn-outline mt-2" onclick="location.reload()">
          <i class="fa-solid fa-refresh mr-2"></i>
          Retry
        </button>
      </div>
    `
  }
}

// Global functions for quick actions
window.setupStore = function() {
  // توجيه المستخدم إلى صفحة إنشاء المتجر
  location.hash = '#/create-store'
}

window.addNewProduct = function() {
  location.hash = '#/products/add'
}

window.editProduct = function(productId) {
  // Use product slug for editing if available, otherwise use ID
  location.hash = `#/products/edit/${productId}`
}

window.viewProduct = function(productId) {
  // Use product slug for viewing if available, otherwise use ID
  location.hash = `#/products/${productId}`
}

window.toggleStock = async function(productId) {
  try {
    const result = await dashboardService.toggleProductStock(productId)
    showToast(result.message, 'success')
    // Reload products to show updated status
    location.reload()
  } catch (error) {
    console.error('Error toggling stock:', error)
    showToast('Failed to update stock status', 'error')
  }
}


/**
 * Load AI insights
 */
async function loadAIInsights(page, storeId) {
  try {
    console.log('Loading AI insights for store:', storeId)

    const insights = await dashboardService.getStoreAIInsights(storeId)
    console.log('AI insights data:', insights)

    const insightsContainer = page.querySelector('#ai-insights')

    if (!insights || !insights.insights || insights.insights.length === 0) {
      insightsContainer.innerHTML = `
        <div class="text-center py-8">
          <div class="text-muted text-4xl mb-4">
            <i class="fa-solid fa-robot"></i>
          </div>
          <p class="text-muted">No AI insights available yet. More data is needed to generate insights.</p>
        </div>
      `
      return
    }

    // Separate insights by priority
    const highPriorityInsights = insights.insights.filter(i => i.priority === 'high') || [];
    const mediumPriorityInsights = insights.insights.filter(i => i.priority === 'medium') || [];
    const lowPriorityInsights = insights.insights.filter(i => i.priority === 'low') || [];

    // Display AI insights with enhanced UI
    insightsContainer.innerHTML = `
      <!-- Performance Score Card -->
      <div class="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-lg font-bold text-gray-800">
            <i class="fa-solid fa-chart-line text-secondary mr-2"></i>
            Store Performance Score
          </h4>
          <span class="text-2xl font-bold text-secondary">${insights.performance_score || 0}%</span>
        </div>
        <div class="flex items-center gap-4 mb-3">
          <div class="flex-1 bg-gray-200 rounded-full h-3">
            <div class="bg-gradient-to-r from-secondary to-primary h-3 rounded-full transition-all duration-500" 
                 style="width: ${insights.performance_score || 0}%"></div>
          </div>
        </div>
        <p class="text-sm text-gray-600">${insights.performance_summary || 'Analyzing your store performance...'}</p>
        <div class="mt-3 text-xs text-gray-500">
          <i class="fa-solid fa-info-circle mr-1"></i>
          Analyzed ${insights.analysis_period || '30 days'} • ${insights.total_insights || 0} recommendations
        </div>
      </div>

      <!-- High Priority Insights -->
      ${highPriorityInsights.length > 0 ? `
        <div class="mb-6">
          <h5 class="text-md font-bold text-red-600 mb-3">
            <i class="fa-solid fa-exclamation-triangle mr-2"></i>
            High Priority Recommendations (${highPriorityInsights.length})
          </h5>
          <div class="space-y-3">
            ${highPriorityInsights.map(insight => `
              <div class="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg">
                <div class="flex items-start gap-3">
                  <div class="text-red-500 text-lg mt-1">
                    <i class="fa-solid ${insight.icon || 'fa-exclamation-triangle'}"></i>
                  </div>
                  <div class="flex-1">
                    <h6 class="font-semibold text-red-800 mb-1">${insight.title}</h6>
                    <p class="text-sm text-red-700 mb-2">${insight.description}</p>
                    ${insight.impact ? `
                      <div class="text-xs text-red-600 mb-2">
                        <i class="fa-solid fa-arrow-up mr-1"></i>
                        Expected Impact: ${insight.impact}
                      </div>
                    ` : ''}
                    ${insight.action ? `
                      <button class="btn btn-sm bg-red-600 text-white hover:bg-red-700 transition-colors">
                        <i class="fa-solid fa-play mr-1"></i>
                        ${insight.action}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Medium Priority Insights -->
      ${mediumPriorityInsights.length > 0 ? `
        <div class="mb-6">
          <h5 class="text-md font-bold text-orange-600 mb-3">
            <i class="fa-solid fa-lightbulb mr-2"></i>
            Medium Priority Recommendations (${mediumPriorityInsights.length})
          </h5>
          <div class="space-y-3">
            ${mediumPriorityInsights.map(insight => `
              <div class="p-4 border-l-4 border-orange-400 bg-orange-50 rounded-r-lg">
                <div class="flex items-start gap-3">
                  <div class="text-orange-500 text-lg mt-1">
                    <i class="fa-solid ${insight.icon || 'fa-lightbulb'}"></i>
                  </div>
                  <div class="flex-1">
                    <h6 class="font-semibold text-orange-800 mb-1">${insight.title}</h6>
                    <p class="text-sm text-orange-700 mb-2">${insight.description}</p>
                    ${insight.impact ? `
                      <div class="text-xs text-orange-600 mb-2">
                        <i class="fa-solid fa-arrow-up mr-1"></i>
                        Expected Impact: ${insight.impact}
                      </div>
                    ` : ''}
                    ${insight.action ? `
                      <button class="btn btn-sm bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                        <i class="fa-solid fa-play mr-1"></i>
                        ${insight.action}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Low Priority Insights -->
      ${lowPriorityInsights.length > 0 ? `
        <div class="mb-6">
          <h5 class="text-md font-bold text-green-600 mb-3">
            <i class="fa-solid fa-thumbs-up mr-2"></i>
            Tips & Improvements (${lowPriorityInsights.length})
          </h5>
          <div class="space-y-3">
            ${lowPriorityInsights.map(insight => `
              <div class="p-4 border-l-4 border-green-400 bg-green-50 rounded-r-lg">
                <div class="flex items-start gap-3">
                  <div class="text-green-500 text-lg mt-1">
                    <i class="fa-solid ${insight.icon || 'fa-thumbs-up'}"></i>
                  </div>
                  <div class="flex-1">
                    <h6 class="font-semibold text-green-800 mb-1">${insight.title}</h6>
                    <p class="text-sm text-green-700 mb-2">${insight.description}</p>
                    ${insight.impact ? `
                      <div class="text-xs text-green-600 mb-2">
                        <i class="fa-solid fa-arrow-up mr-1"></i>
                        التأثير المتوقع: ${insight.impact}
                      </div>
                    ` : ''}
                    ${insight.action ? `
                      <button class="btn btn-sm bg-green-500 text-white hover:bg-green-600 transition-colors">
                        <i class="fa-solid fa-play mr-1"></i>
                        ${insight.action}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Refresh Button -->
      <div class="text-center mt-6">
        <button class="btn btn-outline" onclick="location.reload()">
          <i class="fa-solid fa-refresh mr-2"></i>
          Refresh Recommendations
        </button>
      </div>
    `

  } catch (error) {
    console.error('Error loading AI insights:', error)
    page.querySelector('#ai-insights').innerHTML = `
      <div class="text-center py-8">
        <p class="text-danger">Failed to load AI insights</p>
        <button class="btn btn-outline mt-2" onclick="location.reload()">
          <i class="fa-solid fa-refresh mr-2"></i>
          Retry
        </button>
      </div>
    `
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners(page, storeId) {
  // Quick action buttons
  page.querySelector('#add-product-btn').addEventListener('click', () => {
    location.hash = '#/products/add'
  })

  // page.querySelector('#manage-inventory-btn').addEventListener('click', () => {
  //   location.hash = '#/inventory'
  // })

  
  // })

  page.querySelector('#generate-report-btn').addEventListener('click', () => {
    location.hash = '#/reports'
  })

  page.querySelector('#view-all-products-btn').addEventListener('click', () => {
    location.hash = '#/products'
  })
}
