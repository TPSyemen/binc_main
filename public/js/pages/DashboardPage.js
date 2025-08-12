import { createElementFromHTML, showToast } from "../utils/helpers.js?v=2024"
import { dashboardService, reportsService, promotionsService, productService } from "../services/api.js"
import store from "../state/store.js"

function renderOwnerDashboard(user) {
  const element = createElementFromHTML(`
        <div>
            <h2 class="text-3xl font-bold mb-6">Store Owner Dashboard</h2>

            <!-- Stats Cards -->
            <div id="stats-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="card text-center">
                    <div class="loader mx-auto mb-2"></div>
                    <p class="text-muted">Loading...</p>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div class="card">
                    <h3 class="text-xl font-bold mb-4">Quick Actions</h3>
                    <div class="space-y-3">
                        <button class="btn btn-primary w-full" onclick="addNewProduct()">
                            <i class="fa-solid fa-plus mr-2"></i>
                            Add New Product
                        </button>
                        <button class="btn btn-outline w-full" onclick="manageInventory()">
                            <i class="fa-solid fa-boxes mr-2"></i>
                            Manage Inventory
                        </button>
                        <button class="btn btn-outline w-full" onclick="viewOrders()">
                            <i class="fa-solid fa-shopping-bag mr-2"></i>
                            View Orders
                        </button>
                    </div>
                </div>

                <div class="card">
                    <h3 class="text-xl font-bold mb-4">Generate Reports</h3>
                    <div class="space-y-3">
                        <button id="generate-sales-report" class="btn btn-secondary w-full">
                            <i class="fa-solid fa-chart-line mr-2"></i>
                            Monthly Sales Report
                        </button>
                        <button id="generate-inventory-report" class="btn btn-secondary w-full">
                            <i class="fa-solid fa-warehouse mr-2"></i>
                            Inventory Report
                        </button>
                        <button id="generate-customer-report" class="btn btn-secondary w-full">
                            <i class="fa-solid fa-users mr-2"></i>
                            Customer Analytics
                        </button>
                    </div>
                    <div id="report-status" class="mt-4"></div>
                </div>
            </div>

            <!-- Recent Products -->
            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">My Products</h3>
                    <button class="btn btn-outline" onclick="addNewProduct()">
                        <i class="fa-solid fa-plus mr-2"></i>
                        Add Product
                    </button>
                </div>
                <div id="owner-products-table">
                    <div class="flex justify-center py-8">
                        <div class="loader"></div>
                    </div>
                </div>
            </div>
        </div>
    `)

  // Fetch and render stats
  const statsContainer = element.querySelector("#stats-container")
  dashboardService.getStats().then((stats) => {
    statsContainer.innerHTML = `
            <div class="card text-center">
                <div class="text-3xl text-primary mb-2">
                    <i class="fa-solid fa-box"></i>
                </div>
                <p class="text-muted">Total Products</p>
                <p class="text-2xl font-bold">${stats.total_products || 0}</p>
            </div>
            <div class="card text-center">
                <div class="text-3xl text-success mb-2">
                    <i class="fa-solid fa-shopping-cart"></i>
                </div>
                <p class="text-muted">Total Orders</p>
                <p class="text-2xl font-bold">${stats.total_orders || 0}</p>
            </div>
            <div class="card text-center">
                <div class="text-3xl text-secondary mb-2">
                    <i class="fa-solid fa-dollar-sign"></i>
                </div>
                <p class="text-muted">Total Revenue</p>
                <p class="text-2xl font-bold">$${(stats.total_revenue || 0).toLocaleString()}</p>
            </div>
            <div class="card text-center">
                <div class="text-3xl text-primary mb-2">
                    <i class="fa-solid fa-chart-line"></i>
                </div>
                <p class="text-muted">Monthly Growth</p>
                <p class="text-2xl font-bold text-success">+${(stats.monthly_growth || 0)}%</p>
            </div>
        `
  }).catch(() => {
    statsContainer.innerHTML = `
            <div class="card text-center col-span-full">
                <p class="text-danger">Could not load statistics</p>
            </div>
        `
  })

  // Report generation logic
  const reportBtn = element.querySelector("#generate-sales-report")
  const reportStatusDiv = element.querySelector("#report-status")
  reportBtn.addEventListener("click", async () => {
    showToast("Report generation started...", "info")
    const report = await reportService.generateReport("monthly_sales")
    reportStatusDiv.innerHTML = `Report (ID: ${report.id}) is pending... <button id="check-status" data-id="${report.id}" class="text-secondary ml-2">Check Status</button>`
  })

  reportStatusDiv.addEventListener("click", async (e) => {
    if (e.target.id === "check-status") {
      const reportId = e.target.dataset.id
      const status = await reportService.getReportStatus(reportId)
      if (status.status === "COMPLETED") {
        reportStatusDiv.innerHTML = `
                    <div class="card">
                        <h4 class="font-bold">Report Complete!</h4>
                        <p class="my-2"><strong>AI Summary:</strong> ${status.ai_summary_text}</p>
                        <a href="${status.file_url}" target="_blank" class="btn btn-primary">Download Report</a>
                    </div>
                `
      } else {
        showToast(`Report status: ${status.status}`, "info")
      }
    }
  })

  // Load products table
  loadOwnerProducts(element)

  // Add global functions for quick actions
  window.addNewProduct = function() {
    showToast("Add Product feature coming soon!", "info")
  }

  window.manageInventory = function() {
    showToast("Inventory Management feature coming soon!", "info")
  }

  window.viewOrders = function() {
    showToast("Orders Management feature coming soon!", "info")
  }

  return element
}

async function loadOwnerProducts(element) {
  try {
    const data = await dashboardService.getOwnerProducts()
    const products = data.results || data

    const tableContainer = element.querySelector("#owner-products-table")

    if (products.length === 0) {
      tableContainer.innerHTML = `
        <div class="text-center py-8">
          <div class="text-4xl text-muted mb-4">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <p class="text-muted mb-4">You haven't added any products yet.</p>
          <button class="btn btn-primary" onclick="addNewProduct()">
            <i class="fa-solid fa-plus mr-2"></i>
            Add Your First Product
          </button>
        </div>
      `
      return
    }

    tableContainer.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="text-left p-3">Product</th>
              <th class="text-left p-3">Category</th>
              <th class="text-left p-3">Price</th>
              <th class="text-left p-3">Stock</th>
              <th class="text-left p-3">Status</th>
              <th class="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${products.slice(0, 5).map(product => `
              <tr class="border-b hover:bg-gray-50">
                <td class="p-3">
                  <div class="flex items-center gap-3">
                    <img src="${product.image_urls?.[0] || 'https://via.placeholder.com/50x50/f3f4f6/9ca3af?text=' + encodeURIComponent(product.name)}"
                         alt="${product.name}"
                         class="w-12 h-12 object-cover rounded"
                         onerror="this.src='https://via.placeholder.com/50x50/f3f4f6/9ca3af?text=' + encodeURIComponent('${product.name}'); this.onerror=null;">
                    <div>
                      <p class="font-medium">${product.name}</p>
                      <p class="text-sm text-muted">ID: ${product.id}</p>
                    </div>
                  </div>
                </td>
                <td class="p-3 text-muted">${product.category}</td>
                <td class="p-3 font-medium">$${product.price}</td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded text-xs ${product.stock > 10 ? 'bg-success text-white' : product.stock > 0 ? 'bg-yellow-500 text-white' : 'bg-danger text-white'}">
                    ${product.stock} units
                  </span>
                </td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded text-xs bg-success text-white">
                    Active
                  </span>
                </td>
                <td class="p-3">
                  <div class="flex gap-2">
                    <button class="text-secondary hover:text-blue-600" onclick="editProduct(${product.id})" title="Edit">
                      <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="text-primary hover:text-gray-600" onclick="viewProduct(${product.id})" title="View">
                      <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="text-danger hover:text-red-600" onclick="deleteProduct(${product.id})" title="Delete">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${products.length > 5 ? `
        <div class="text-center mt-4">
          <a href="#/products" class="btn btn-outline">View All Products</a>
        </div>
      ` : ''}
    `

    // Add global functions for product actions
    window.editProduct = function(id) {
      showToast("Edit Product feature coming soon!", "info")
    }

    window.viewProduct = function(id) {
      location.hash = `/products/${id}`
    }

    window.deleteProduct = function(id) {
      if (confirm("Are you sure you want to delete this product?")) {
        showToast("Delete Product feature coming soon!", "info")
      }
    }

  } catch (error) {
    element.querySelector("#owner-products-table").innerHTML = `
      <div class="text-center py-8">
        <p class="text-danger">Could not load products</p>
      </div>
    `
  }
}

function renderAdminDashboard(user) {
  return createElementFromHTML(`
        <div>
            <h2 class="text-3xl font-bold mb-6">Admin Dashboard</h2>
            <p>Admin-specific components for user management, site-wide analytics, and system settings would be here.</p>
        </div>
    `)
}

function renderCustomerDashboard(user) {
  return createElementFromHTML(`
        <div>
            <h2 class="text-3xl font-bold mb-6">My Account</h2>

            <!-- Profile Overview -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div class="card text-center">
                    <div class="w-20 h-20 bg-secondary rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <h3 class="font-bold text-lg">${user.first_name} ${user.last_name}</h3>
                    <p class="text-muted">${user.email}</p>
                    <button class="btn btn-outline mt-4" onclick="editProfile()">
                        <i class="fa-solid fa-edit mr-2"></i>
                        Edit Profile
                    </button>
                </div>

                <div class="card">
                    <h3 class="font-bold mb-4">Quick Actions</h3>
                    <div class="space-y-3">
                        <button class="btn btn-primary w-full" onclick="viewOrders()">
                            <i class="fa-solid fa-shopping-bag mr-2"></i>
                            My Orders
                        </button>
                        <button class="btn btn-outline w-full" onclick="viewWishlist()">
                            <i class="fa-solid fa-heart mr-2"></i>
                            My Wishlist
                        </button>
                        <button class="btn btn-outline w-full" onclick="viewAddresses()">
                            <i class="fa-solid fa-map-marker-alt mr-2"></i>
                            My Addresses
                        </button>
                    </div>
                </div>

                <div class="card">
                    <h3 class="font-bold mb-4">Account Settings</h3>
                    <div class="space-y-3">
                        <button class="btn btn-outline w-full" onclick="changePassword()">
                            <i class="fa-solid fa-lock mr-2"></i>
                            Change Password
                        </button>
                        <button class="btn btn-outline w-full" onclick="notificationSettings()">
                            <i class="fa-solid fa-bell mr-2"></i>
                            Notifications
                        </button>
                        <button class="btn btn-outline w-full" onclick="privacySettings()">
                            <i class="fa-solid fa-shield-alt mr-2"></i>
                            Privacy Settings
                        </button>
                    </div>
                </div>
            </div>

            <!-- Recent Orders -->
            <div class="card">
                <h3 class="text-xl font-bold mb-4">Recent Orders</h3>
                <div class="text-center py-8">
                    <div class="text-4xl text-muted mb-4">
                        <i class="fa-solid fa-shopping-bag"></i>
                    </div>
                    <p class="text-muted mb-4">You haven't placed any orders yet.</p>
                    <a href="#/products" class="btn btn-primary">
                        <i class="fa-solid fa-shopping-cart mr-2"></i>
                        Start Shopping
                    </a>
                </div>
            </div>
        </div>
    `)
}

export default function DashboardPage() {
  const { user } = store.getState()

  // Redirect store owners to the new store dashboard
  if (user && user.role === "store_owner") {
    location.hash = '#/store-dashboard'
    return createElementFromHTML(`
      <div class="container mx-auto py-8 px-4">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          <p class="mt-2 text-muted">Redirecting to Store Dashboard...</p>
        </div>
      </div>
    `)
  }

  const page = createElementFromHTML(`
        <div class="container mx-auto py-8 px-4">
            <div class="mb-8">
                <h1 class="text-4xl font-extrabold mb-2">Welcome back, ${user.first_name || user.username}!</h1>
                <p class="text-muted">Manage your account and explore our features</p>
            </div>
            <div id="dashboard-content"></div>
        </div>
    `)

  const contentContainer = page.querySelector("#dashboard-content")
  if (user.role === "admin") {
    contentContainer.appendChild(renderAdminDashboard(user))
  } else {
    contentContainer.appendChild(renderCustomerDashboard(user))
  }

  // Add global functions for customer actions
  window.editProfile = function() {
    showToast("Edit Profile feature coming soon!", "info")
  }

  window.viewOrders = function() {
    showToast("Orders feature coming soon!", "info")
  }

  window.viewWishlist = function() {
    showToast("Wishlist feature coming soon!", "info")
  }

  window.viewAddresses = function() {
    showToast("Address Management feature coming soon!", "info")
  }

  window.changePassword = function() {
    showToast("Change Password feature coming soon!", "info")
  }

  window.notificationSettings = function() {
    showToast("Notification Settings feature coming soon!", "info")
  }

  window.privacySettings = function() {
    showToast("Privacy Settings feature coming soon!", "info")
  }

  return page
}
