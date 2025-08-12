/**
 * Cart Component
 * Handles shopping cart functionality with backend integration
 */

import { cartService } from '../services/api.js'
import { showToast } from '../utils/helpers.js'
import store from '../state/store.js'

export class Cart {
  constructor() {
    this.cartItems = []
    this.isLoading = false
    this.total = 0
    this.itemCount = 0
    
    // Bind methods
    this.loadCart = this.loadCart.bind(this)
    this.addToCart = this.addToCart.bind(this)
    this.updateQuantity = this.updateQuantity.bind(this)
    this.removeItem = this.removeItem.bind(this)
    this.clearCart = this.clearCart.bind(this)
    
    // Initialize cart
    this.loadCart()
  }

  /**
   * Get or create session ID for guest users
   */
  getSessionId() {
    let sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
      localStorage.setItem('session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Load cart from backend
   */
  async loadCart() {
    try {
      this.isLoading = true

      // Get session ID for guest users
      const sessionId = store.getState().isAuthenticated ? null : this.getSessionId()

      const response = await cartService.getCart(sessionId)

      this.cartItems = response.items || []
      this.total = response.total_price || 0
      this.itemCount = response.total_items || 0

      // Update store
      store.setState({ cart: this.cartItems })

      // Update UI
      this.updateCartUI()

    } catch (error) {
      console.error('Failed to load cart:', error)
      // Don't show error toast for initial load failures
      if (this.cartItems.length > 0) {
        showToast('Failed to sync cart', 'error')
      }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(productId, quantity = 1) {
    try {
      this.isLoading = true

      // Get session ID for guest users
      const sessionId = store.getState().isAuthenticated ? null : this.getSessionId()

      const response = await cartService.addToCart(productId, quantity, sessionId)

      if (response.success || response.message || response.cart) {
        showToast(`Added ${quantity} item(s) to cart`, 'success')
        await this.loadCart() // Refresh cart
      } else {
        throw new Error(response.error || 'Failed to add to cart')
      }

      return response

    } catch (error) {
      console.error('Failed to add to cart:', error)
      const errorMessage = error.message || 'Failed to add item to cart'
      showToast(errorMessage, 'error')
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Update item quantity
   */
  async updateQuantity(productId, quantity) {
    try {
      this.isLoading = true
      
      if (quantity <= 0) {
        return await this.removeItem(productId)
      }
      
      const response = await cartService.updateCartItem(productId, quantity)
      
      if (response.success) {
        showToast('Cart updated', 'success')
        await this.loadCart() // Refresh cart
      }
      
      return response
      
    } catch (error) {
      console.error('Failed to update cart:', error)
      showToast('Failed to update cart', 'error')
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(productId) {
    try {
      this.isLoading = true
      
      const response = await cartService.removeFromCart(productId)
      
      if (response.success) {
        showToast('Item removed from cart', 'success')
        await this.loadCart() // Refresh cart
      }
      
      return response
      
    } catch (error) {
      console.error('Failed to remove from cart:', error)
      showToast('Failed to remove item', 'error')
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart() {
    try {
      this.isLoading = true
      
      const response = await cartService.clearCart()
      
      if (response.success) {
        showToast('Cart cleared', 'success')
        this.cartItems = []
        this.total = 0
        this.itemCount = 0
        
        // Update store
        store.setState({ cart: [] })
        
        // Update UI
        this.updateCartUI()
      }
      
      return response
      
    } catch (error) {
      console.error('Failed to clear cart:', error)
      showToast('Failed to clear cart', 'error')
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Update cart UI elements
   */
  updateCartUI() {
    // Update cart badge
    const cartBadges = document.querySelectorAll('.cart-badge')
    cartBadges.forEach(badge => {
      badge.textContent = this.itemCount
      badge.style.display = this.itemCount > 0 ? 'block' : 'none'
    })

    // Update cart total
    const cartTotals = document.querySelectorAll('.cart-total')
    cartTotals.forEach(total => {
      total.textContent = `$${this.total.toFixed(2)}`
    })

    // Update cart dropdown if exists
    this.updateCartDropdown()
  }

  /**
   * Update cart dropdown content
   */
  updateCartDropdown() {
    const cartDropdown = document.querySelector('.cart-dropdown-content')
    if (!cartDropdown) return

    if (this.cartItems.length === 0) {
      cartDropdown.innerHTML = `
        <div class="p-4 text-center text-gray-500">
          <i class="fa-solid fa-shopping-cart text-3xl mb-2"></i>
          <p>Your cart is empty</p>
        </div>
      `
      return
    }

    const itemsHtml = this.cartItems.map(item => `
      <div class="flex items-center p-3 border-b border-gray-100">
        <img src="${item.product.image_url || '/images/placeholder.jpg'}" 
             alt="${item.product.name}" 
             class="w-12 h-12 object-cover rounded">
        <div class="ml-3 flex-1">
          <h4 class="font-medium text-sm">${item.product.name}</h4>
          <p class="text-gray-500 text-xs">$${item.price_when_added} x ${item.quantity}</p>
        </div>
        <button onclick="cart.removeItem(${item.product.id})" 
                class="text-red-500 hover:text-red-700 ml-2">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `).join('')

    cartDropdown.innerHTML = `
      ${itemsHtml}
      <div class="p-3 border-t border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <span class="font-semibold">Total: $${this.total.toFixed(2)}</span>
        </div>
        <div class="space-y-2">
          <a href="/cart/" class="btn btn-secondary w-full text-center block">View Cart</a>
          <a href="/checkout/" class="btn btn-primary w-full text-center block">Checkout</a>
        </div>
      </div>
    `
  }

  /**
   * Get cart summary
   */
  getSummary() {
    return {
      items: this.cartItems,
      total: this.total,
      itemCount: this.itemCount,
      isLoading: this.isLoading
    }
  }
}

// Create global cart instance
window.cart = new Cart()

export default window.cart
