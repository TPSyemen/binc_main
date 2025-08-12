/**
 * Cart Page Component
 */
import { createElementFromHTML, formatCurrency, showToast } from "../utils/helpers.js"
import { cartService } from "../services/api.js"
import store from "../state/store.js"

export default function CartPage() {
  const page = createElementFromHTML(`
    <div class="min-h-screen bg-gray-50">
      <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-primary">Shopping Cart</h1>
          <p class="text-gray-600 text-sm mt-1">Review your items and proceed to checkout</p>
        </div>

        <!-- Cart Content -->
        <div class="flex flex-col lg:flex-row gap-8">
          <!-- Cart Items Section -->
          <div class="w-full lg:w-2/3">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-primary">Cart Items (<span id="items-count">0</span>)</h2>
              <button class="text-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-2" onclick="clearCart()">
                <i class="fa-solid fa-trash"></i>
                Clear Cart
              </button>
            </div>

            <!-- Cart Items List -->
            <div id="cart-items" class="space-y-4">
              <!-- Loading State -->
              <div class="flex justify-center py-12">
                <div class="text-center">
                  <div class="loader w-12 h-12 border-4 border-gray-200 border-t-secondary rounded-full animate-spin mx-auto mb-4"></div>
                  <p class="text-gray-500">Loading your cart...</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Summary Section -->
          <div class="w-full lg:w-1/3">
            <div id="order-summary" class="lg:sticky lg:top-4 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 class="text-xl font-semibold text-primary mb-6">Order Summary</h2>
              
              <div class="space-y-4 mb-6">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal (<span id="summary-count">0</span> items)</span>
                  <span id="subtotal" class="font-semibold text-gray-900">$0.00</span>
                </div>
                <div class="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span class="text-green-600 font-semibold">Free</span>
                </div>
                <div class="border-t border-gray-100 pt-4 mt-4">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-900 font-semibold">Total</span>
                    <span id="total" class="text-2xl font-bold text-secondary">$0.00</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-2">* Prices include VAT if applicable</p>
                </div>
              </div>
              
              <button class="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold py-3.5 rounded-lg transition-all duration-200 mb-4 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                      onclick="proceedToCheckout()">
                <i class="fa-solid fa-lock text-sm"></i>
                Proceed to Checkout
              </button>
              
              <a href="#/products" 
                 class="w-full border border-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-colors text-center block flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrow-left text-sm"></i>
                Continue Shopping
              </a>

              <div class="mt-6 pt-6 border-t border-gray-100">
                <div class="flex items-center gap-3 text-sm text-gray-500">
                  <i class="fa-solid fa-shield-alt text-secondary"></i>
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `)

  // Initialize cart page
  initializeCartPage(page)

  return page
}

function initializeCartPage(page) {
  let cartData = null
  let isLoading = false

  // Get session ID for guest users
  function getSessionId() {
    let sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
      localStorage.setItem('session_id', sessionId)
    }
    return sessionId
  }

  // Load cart data
  async function loadCart() {
    try {
      isLoading = true

      // Get session ID for guest users
      const { isAuthenticated } = store.getState()
      const sessionId = isAuthenticated ? null : getSessionId()

      const response = await cartService.getCart(sessionId)
      cartData = response
      renderCart()
    } catch (error) {
      console.error('Failed to load cart:', error)
      renderError()
    } finally {
      isLoading = false
    }
  }

  // Render cart content
  function renderCart() {
    if (!cartData || !cartData.items || cartData.items.length === 0) {
      renderEmptyCart()
      return
    }

    // Update items count
    updateItemsCount()

    // Render cart items
    renderCartItems()

    // Update summary
    updateSummary()
  }

  // Update items count
  function updateItemsCount() {
    const itemsCount = page.querySelector('#items-count')
    const summaryCount = page.querySelector('#summary-count')
    const count = cartData.total_items || 0
    
    if (itemsCount) itemsCount.textContent = count
    if (summaryCount) summaryCount.textContent = count
  }

  // Render empty cart state
  function renderEmptyCart() {
    const cartItems = page.querySelector('#cart-items')
    
    if (cartItems) {
      cartItems.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <div class="max-w-md mx-auto">
            <i class="fa-solid fa-shopping-cart text-6xl text-gray-300 mb-4"></i>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
            <p class="text-gray-600 mb-6">Looks like you haven't added any items to your cart yet.</p>
            <a href="#/products" class="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200">
              <i class="fa-solid fa-shopping-bag"></i>
              Start Shopping
            </a>
          </div>
        </div>
      `
    }

    // Reset summary
    updateSummary(true)
  }

  // Render cart items
  function renderCartItems() {
    const cartItems = page.querySelector('#cart-items')
    
    if (!cartItems) return

    cartItems.innerHTML = cartData.items.map(item => `
      <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div class="flex items-start gap-4">
          <!-- Product Image -->
          <div class="w-24 h-24 flex-shrink-0">
            <img src="${item.product.image_urls?.[0] || '/images/placeholder.jpg'}" 
                 alt="${item.product.name}"
                 class="w-full h-full object-cover rounded-lg border border-gray-100">
          </div>
          
          <!-- Product Info -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h3 class="font-semibold text-gray-900 mb-1">
                  <a href="#/products/${item.product.slug}" class="hover:text-secondary transition-colors">
                    ${item.product.name}
                  </a>
                </h3>
                <p class="text-sm text-gray-500">${item.product.category?.name || 'Uncategorized'}</p>
                <div class="mt-1 font-semibold text-secondary">
                  ${formatCurrency(item.price_when_added)}
                </div>
              </div>

              <div class="flex flex-col sm:items-end gap-3">
                <!-- Quantity Controls -->
                <div class="flex items-center gap-3">
                  <button class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-secondary hover:text-secondary transition-colors"
                          onclick="updateQuantity('${item.id}', ${item.quantity - 1})"
                          ${item.quantity <= 1 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}>
                    <i class="fa-solid fa-minus text-xs"></i>
                  </button>
                  <span class="w-12 text-center font-semibold">${item.quantity}</span>
                  <button class="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:border-secondary hover:text-secondary transition-colors"
                          onclick="updateQuantity('${item.id}', ${item.quantity + 1})">
                    <i class="fa-solid fa-plus text-xs"></i>
                  </button>
                </div>

                <!-- Total Price -->
                <div class="text-right">
                  <div class="font-bold text-lg text-primary">
                    ${formatCurrency(item.total_price || (item.price_when_added * item.quantity))}
                  </div>
                  <button class="text-sm text-red-500 hover:text-red-700 transition-colors mt-2 flex items-center gap-1"
                          onclick="removeItem('${item.id}')">
                    <i class="fa-solid fa-trash text-xs"></i>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('')
  }

  // Update order summary
  function updateSummary(isEmpty = false) {
    const subtotal = page.querySelector('#subtotal')
    const total = page.querySelector('#total')
    
    if (isEmpty) {
      if (subtotal) subtotal.textContent = formatCurrency(0)
      if (total) total.textContent = formatCurrency(0)
      return
    }

    const totalPrice = cartData.total_price || 0
    
    if (subtotal) subtotal.textContent = formatCurrency(totalPrice)
    if (total) total.textContent = formatCurrency(totalPrice)
  }

  // Render error state
  function renderError() {
    const cartItems = page.querySelector('#cart-items')
    
    if (cartItems) {
      cartItems.innerHTML = `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <div class="max-w-md mx-auto">
            <i class="fa-solid fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
            <h2 class="text-2xl font-bold text-gray-800 mb-2">Failed to load cart</h2>
            <p class="text-gray-600 mb-6">There was an error loading your cart. Please try again.</p>
            <button class="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/90 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
                    onclick="location.reload()">
              <i class="fa-solid fa-refresh"></i>
              Retry
            </button>
          </div>
        </div>
      `
    }

    // Reset summary
    updateSummary(true)
  }

  // Global functions for cart interactions
  window.updateQuantity = async function(cartItemId, newQuantity) {
    try {
      const { isAuthenticated } = store.getState()
      const sessionId = isAuthenticated ? null : getSessionId()

      if (window.cart) {
        await window.cart.updateQuantity(cartItemId, newQuantity)
      } else {
        await cartService.updateCartItem(cartItemId, newQuantity, sessionId)
      }
      await loadCart() // Refresh cart
      showToast('Cart updated successfully', 'success')
    } catch (error) {
      console.error('Failed to update quantity:', error)
      showToast('Failed to update quantity', 'error')
    }
  }

  window.removeItem = async function(cartItemId) {
    try {
      const { isAuthenticated } = store.getState()
      const sessionId = isAuthenticated ? null : getSessionId()

      if (window.cart) {
        await window.cart.removeItem(cartItemId)
      } else {
        await cartService.removeFromCart(cartItemId, sessionId)
      }
      await loadCart() // Refresh cart
      showToast('Item removed from cart', 'success')
    } catch (error) {
      console.error('Failed to remove item:', error)
      showToast('Failed to remove item', 'error')
    }
  }

  window.clearCart = async function() {
    if (confirm('Are you sure you want to clear your cart?')) {
      try {
        const { isAuthenticated } = store.getState()
        const sessionId = isAuthenticated ? null : getSessionId()

        if (window.cart) {
          await window.cart.clearCart()
        } else {
          await cartService.clearCart(sessionId)
        }
        await loadCart() // Refresh cart
        showToast('Cart cleared successfully', 'success')
      } catch (error) {
        console.error('Failed to clear cart:', error)
        showToast('Failed to clear cart', 'error')
      }
    }
  }

  window.proceedToCheckout = function() {
    // TODO: Implement checkout functionality
    showToast('Checkout functionality coming soon!', 'info')
  }

  // Initialize
  loadCart()
}
