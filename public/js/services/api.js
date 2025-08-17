import store from "../state/store.js"
import { showToast } from "../utils/helpers.js?v=2024"
import {
  mockAuthService,
  mockProductService,
  mockDashboardService,
  mockBehaviorService,
  mockReportService,
  mockRecommendationService
} from "./mockApi.js"

// The base URL for all API requests, as specified.
const API_BASE_URL = "http://localhost:8000/api"

// Flag to use mock API when backend is not available
let USE_MOCK_API = false

/**
 * A wrapper around the native fetch API.
 * - Automatically adds the Authorization header for authenticated requests.
 * - Handles JSON parsing and error responses.
 * @param {string} endpoint - The API endpoint to call (e.g., '/auth/login/').
 * @param {object} options - The options for the fetch request (method, body, etc.).
 * @returns {Promise<object>} The JSON response from the API.
 */
async function apiFetch(endpoint, options = {}) {
  const { token } = store.getState()

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      // If backend is not available, switch to mock API
      if (response.status === 0 || !response.status) {
        console.log("Backend not available, switching to mock API")
        USE_MOCK_API = true
        throw new Error("BACKEND_UNAVAILABLE")
      }

      const errorData = await response.json().catch(() => ({ detail: response.statusText }))

      // Handle token expiration/invalidation
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token')

        // Try to refresh token if we have a refresh token and this isn't already a refresh request
        if (refreshToken && !endpoint.includes('/auth/token/refresh/')) {
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refresh: refreshToken }),
            })

            if (refreshResponse.ok) {
              const tokenData = await refreshResponse.json()
              localStorage.setItem('access_token', tokenData.access)
              if (tokenData.refresh) {
                localStorage.setItem('refresh_token', tokenData.refresh)
              }

              // Update store with new token
              store.setState({ token: tokenData.access })

              // Retry the original request with new token
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${tokenData.access}`
              }

              const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: retryHeaders,
              })

              if (retryResponse.ok) {
                return retryResponse.status === 204 ? null : await retryResponse.json()
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError)
          }
        }

        // If refresh failed or no refresh token, logout user
        showToast("Session expired. Please log in again.", "error")
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        store.setState({ isAuthenticated: false, user: null, token: null })
        location.hash = "/login"
      }

      throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData))
    }

    // Handle responses with no content (e.g., 204 No Content)
    if (response.status === 204) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error(`API Error fetching ${endpoint}:`, error)

    // Only use mock API if explicitly enabled or if it's a network error (not CORS)
    if (USE_MOCK_API || (error.name === "TypeError" && error.message.includes("Failed to fetch"))) {
      console.warn("⚠️ USING MOCK DATA - Backend not available. Real backend should be running at http://localhost:8000/api")
      console.log("Mock API call for:", endpoint)
      return await handleMockApiCall(endpoint, options)
    }

    // For CORS errors, show specific message
    if (error.message.includes("CORS") || error.message.includes("Cross-Origin")) {
      showToast("CORS error: Please check backend CORS settings", "error")
    } else {
      showToast(error.message, "error")
    }

    throw error
  }
}

// Handle mock API calls
async function handleMockApiCall(endpoint, options) {
  if (endpoint.startsWith("/auth/login")) {
    const body = JSON.parse(options.body || '{}')
    return await mockAuthService.login(body.username, body.password)
  } else if (endpoint.startsWith("/auth/register")) {
    const body = JSON.parse(options.body || '{}')
    return await mockAuthService.register(body)
  } else if (endpoint.startsWith("/auth/profile")) {
    return await mockAuthService.getProfile()
  } else if (endpoint.startsWith("/products/") && endpoint.includes("/similar")) {
    const id = endpoint.split('/')[2]
    return await mockProductService.getSimilarProducts(id)
  } else if (endpoint.startsWith("/products/") && endpoint.split('/').length > 3) {
    const id = endpoint.split('/')[2]
    return await mockProductService.getProductById(id)
  } else if (endpoint.startsWith("/products")) {
    return await mockProductService.getProducts()
  } else if (endpoint.startsWith("/dashboard/stats")) {
    return await mockDashboardService.getStats()
  } else if (endpoint.startsWith("/dashboard/my-products")) {
    return await mockDashboardService.getOwnerProducts()
  } else if (endpoint.startsWith("/user-behavior/log")) {
    const body = JSON.parse(options.body || '{}')
    return await mockBehaviorService.log(body)
  } else if (endpoint.startsWith("/user-behavior/realtime")) {
    return await mockBehaviorService.getRealtimeRecs()
  } else if (endpoint.startsWith("/reports/generate")) {
    const body = JSON.parse(options.body || '{}')
    return await mockReportService.generateReport(body.report_type)
  } else if (endpoint.startsWith("/reports/") && endpoint.includes("/status")) {
    const id = endpoint.split('/')[2]
    return await mockReportService.getReportStatus(id)
  } else {
    throw new Error(`Mock API endpoint not implemented: ${endpoint}`)
  }
}

// Export specific API service functions
export const authService = {
  async login(username, password) {
    try {
      const response = await apiFetch("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })

      // Store tokens in localStorage
      if (response.access) {
        localStorage.setItem('access_token', response.access)
      }
      if (response.refresh) {
        localStorage.setItem('refresh_token', response.refresh)
      }

      return response
    } catch (error) {
      throw error
    }
  },

  async register(userData) {
    try {
      console.log('AuthService.register called with:', userData)
      const response = await apiFetch("/auth/register/", {
        method: "POST",
        body: JSON.stringify(userData),
      })

      console.log('Registration API response:', response)

      // Store tokens if registration includes auto-login
      if (response.access) {
        localStorage.setItem('access_token', response.access)
      }
      if (response.refresh) {
        localStorage.setItem('refresh_token', response.refresh)
      }

      return response
    } catch (error) {
      console.error('AuthService.register error:', error)
      throw error
    }
  },

  async logout() {
    try {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        await apiFetch("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh: refreshToken }),
        })
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear local storage regardless of API call success
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      store.setState({ isAuthenticated: false, user: null, token: null })
    }
  },

  getProfile: () => apiFetch("/auth/profile/"),
  updateProfile: (userData) =>
    apiFetch("/auth/profile/", {
      method: "PATCH",
      body: JSON.stringify(userData),
    }),
  changePassword: (passwordData) =>
    apiFetch("/auth/change-password/", {
      method: "POST",
      body: JSON.stringify(passwordData),
    }),
  refreshToken: (refreshToken) =>
    apiFetch("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh: refreshToken }),
    }),
}

export const productService = {
  getProducts: async (params = "") => {
    try {
      return await apiFetch(`/products/?${params}`);
    } catch (error) {
      if (USE_MOCK_API || error.message === "BACKEND_UNAVAILABLE") {
        return await mockProductService.getProducts(params);
      }
      throw error;
    }
  },
  getProductById: async (identifier) => {
    try {
      return await apiFetch(`/products/${identifier}/`);
    } catch (error) {
      if (USE_MOCK_API || error.message === "BACKEND_UNAVAILABLE") {
        return await mockProductService.getProductById(identifier);
      }
      throw error;
    }
  },
  getSimilarProducts: async (identifier) => {
    try {
      return await apiFetch(`/products/${identifier}/similar/`);
    } catch (error) {
      if (USE_MOCK_API || error.message === "BACKEND_UNAVAILABLE") {
        return await mockProductService.getSimilarProducts(identifier);
      }
      throw error;
    }
  },
  /**
   * جلب مراجعات منتج معين
   */
  getProductReviews: (slug) => apiFetch(`/products/${slug}/reviews/`),
  /**
   * إضافة مراجعة جديدة لمنتج
   */
  createProductReview: (slug, reviewData) =>
    apiFetch(`/products/${slug}/reviews/`, {
      method: "POST",
      body: JSON.stringify(reviewData),
    }),
  getBestProducts: () => apiFetch("/products/best/"),
  createProduct: (productData) =>
    apiFetch("/products/create/", {
      method: "POST",
      body: JSON.stringify(productData),
    }),
  updateProduct: (slug, productData) =>
    apiFetch(`/products/${slug}/update/`, {
      method: "PATCH",
      body: JSON.stringify(productData),
    }),
  toggleLike: (slug) =>
    apiFetch(`/products/${slug}/like/`, {
      method: "POST",
    }),
  getCategories: () => apiFetch("/products/categories/"),
  getBrands: () => apiFetch("/products/brands/"),
  getStores: (params = "") => apiFetch(`/products/stores/?${params}`),
  getStoreBySlug: (slug) => apiFetch(`/products/stores/${slug}/`),
  /**
   * إنشاء متجر جديد
   */
  createStore: (storeData) =>
    apiFetch("/products/stores/", {
      method: "POST",
      body: JSON.stringify(storeData),
    }),
}

export const cartService = {
  getCart: (sessionId = null) => {
    const params = sessionId ? `?session_id=${sessionId}` : ''
    return apiFetch(`/cart/${params}`)
  },
    getSavedItems: () => apiFetch("/cart/saved/"), // This correctly calls apiFetch for the array

  addToCart: (productId, quantity = 1, sessionId = null) => {
    const body = { product_id: productId, quantity }
    if (sessionId) body.session_id = sessionId

    return apiFetch("/cart/add/", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },
  updateCartItem: (cartItemId, quantity, sessionId = null) => {
    const body = { cart_item_id: cartItemId, quantity }
    if (sessionId) body.session_id = sessionId

    return apiFetch("/cart/update/", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  },
  removeFromCart: (cartItemId, sessionId = null) => {
    const body = { cart_item_id: cartItemId }
    if (sessionId) body.session_id = sessionId

    return apiFetch("/cart/remove/", {
      method: "DELETE",
      body: JSON.stringify(body),
    })
  },
  clearCart: (sessionId = null) => {
    const body = {}
    if (sessionId) body.session_id = sessionId

    return apiFetch("/cart/clear/", {
      method: "DELETE",
      body: JSON.stringify(body),
    })
  },
  getSavedItems: () => apiFetch("/cart/saved/"),
  saveItem: (productId, notes = "") =>
    apiFetch("/cart/save-item/", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, notes }),
    }),
  unsaveItem: (productId) =>
    apiFetch("/cart/unsave-item/", {
      method: "DELETE",
      body: JSON.stringify({ product_id: productId }),
    }),
}

export const behaviorService = {
  log: (behaviorData) =>
    apiFetch("/user-behavior/log/", {
      method: "POST",
      body: JSON.stringify(behaviorData),
    }),
  getRealtimeRecs: () => apiFetch("/user-behavior/realtime-personalization/"),
}

export const dashboardService = {
  // Store Analytics
  getStoreAnalytics: (storeId, days = 30) =>
    apiFetch(`/dashboard/stores/${storeId}/analytics/?days=${days}`),
  getStorePerformance: (storeId) =>
    apiFetch(`/dashboard/stores/${storeId}/performance/`),
  getStoreAIInsights: (storeId) =>
    apiFetch(`/dashboard/stores/${storeId}/ai-insights/`),

  // Product Management
  getStoreProducts: (storeId) =>
    apiFetch(`/dashboard/stores/${storeId}/products/`),
  createProduct: (productData) =>
    apiFetch("/products/create/", {
      method: "POST",
      body: JSON.stringify(productData),
    }),
  updateProduct: (slug, productData) =>
    apiFetch(`/products/${slug}/update/`, {
      method: "PATCH",
      body: JSON.stringify(productData),
    }),
  toggleProductStock: (productId) =>
    apiFetch(`/dashboard/products/${productId}/toggle-stock/`, {
      method: "POST",
    }),
  getProductPerformance: (productId) =>
    apiFetch(`/dashboard/products/${productId}/performance/`),

  /**
   * جلب بيانات المتجر الخاص بالمستخدم الحالي
   * يفترض وجود endpoint: /dashboard/my-store/
   */
  getMyStore: () => apiFetch('/dashboard/my-store/'),
}

export const reportsService = {
  // Report Generation
  generateReport: (reportData) =>
    apiFetch("/reports/generate/", {
      method: "POST",
      body: JSON.stringify(reportData),
    }),
  getReports: () => apiFetch("/reports/"),
  getReportDetails: (reportId) => apiFetch(`/reports/${reportId}/`),
  getReportStatus: (reportId) => apiFetch(`/reports/${reportId}/status/`),
  downloadReport: (reportId) => apiFetch(`/reports/${reportId}/download/`),

  // Report Schedules
  getReportSchedules: () => apiFetch("/reports/schedules/"),
  createReportSchedule: (scheduleData) =>
    apiFetch("/reports/schedules/", {
      method: "POST",
      body: JSON.stringify(scheduleData),
    }),
}

export const promotionsService = {
  // Store Promotions
  getStoreDiscountHistory: (storeId) =>
    apiFetch(`/promotions/stores/${storeId}/discount-history/`),
  validateStoreQR: (qrData) =>
    apiFetch("/promotions/validate-store-qr/", {
      method: "POST",
      body: JSON.stringify(qrData),
    }),
  generateUserQR: (qrData) =>
    apiFetch("/promotions/generate-user-qr/", {
      method: "POST",
      body: JSON.stringify(qrData),
    }),
  getUserQRCodes: () => apiFetch("/promotions/my-qr-codes/"),
}

export const reportService = {
  generateReport: (reportType) =>
    apiFetch("/reports/generate/", {
      method: "POST",
      body: JSON.stringify({ report_type: reportType }),
    }),
  getReportStatus: (id) => apiFetch(`/reports/${id}/status/`),
}

export const recommendationService = {
  getRecommendations: async (params = "") => {
    try {
      return await apiFetch(`/recommendations/general/?${params}`);
    } catch (error) {
      if (USE_MOCK_API || error.message === "BACKEND_UNAVAILABLE") {
        return await mockRecommendationService.getRecommendations(params);
      }
      throw error;
    }
  },
  
  getPersonalizedRecs: async (params = "") => {
    try {
      const response = await apiFetch(`/recommendations/personalized/?${params}`);
      return response;
    } catch (error) {
      console.warn("Backend unavailable, using mock data:", error.message);
      if (USE_MOCK_API || error.message === "BACKEND_UNAVAILABLE") {
        return await mockRecommendationService.getPersonalizedRecs();
      }
      throw error;
    }
  },

  getSimilarProducts: async (productId, limit = 10) => {
    try {
      return await apiFetch(`/recommendations/similar/${productId}/?limit=${limit}`);
    } catch (error) {
      console.warn("Failed to get similar products:", error);
      return { recommendations: [], message: "Failed to load similar products" };
    }
  },

  getTrendingProducts: async (limit = 20) => {
    try {
      return await apiFetch(`/recommendations/trending/?limit=${limit}`);
    } catch (error) {
      console.warn("Failed to get trending products:", error);
      return { recommendations: [], message: "Failed to load trending products" };
    }
  },

  trackBehavior: async (behaviorData) => {
    try {
      return await apiFetch("/recommendations/track-behavior/", {
        method: "POST",
        body: JSON.stringify(behaviorData),
      });
    } catch (error) {
      console.warn("Failed to track behavior:", error);
      return false;
    }
  },

  trackRecommendationInteraction: async (interactionData) => {
    try {
      return await apiFetch("/recommendations/track/", {
        method: "POST",
        body: JSON.stringify(interactionData),
      });
    } catch (error) {
      console.warn("Failed to track recommendation interaction:", error);
      return false;
    }
  },
}

export const comparisonService = {
  getComparisons: () => apiFetch("/comparisons/"),
  createComparison: (productIds) =>
    apiFetch("/comparisons/", {
      method: "POST",
      body: JSON.stringify({ product_ids: productIds }),
    }),
  deleteComparison: (id) =>
    apiFetch(`/comparisons/${id}/`, {
      method: "DELETE",
    }),
}

export const commentService = {
  getComments: (productSlug) => apiFetch(`/comments/?product=${productSlug}`),
  createComment: (commentData) =>
    apiFetch("/comments/", {
      method: "POST",
      body: JSON.stringify(commentData),
    }),
  updateComment: (id, commentData) =>
    apiFetch(`/comments/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(commentData),
    }),
  deleteComment: (id) =>
    apiFetch(`/comments/${id}/`, {
      method: "DELETE",
    }),
}
