// Compare button handler: navigates to Compare page with product ID (number only)
window.compareProduct = function(productId, event = null) {
  if (event) {
    const button = event.target.closest('button');
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    button.disabled = true;
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.disabled = false;
    }, 1000);
  }
  // Navigate to compare page with product id in hash
  location.hash = `/compare?product=${encodeURIComponent(productId)}`;
}
import { formatCurrency, showToast } from "../utils/helpers.js?v=2024"
import store from "../state/store.js"

/**
 * Creates a product card component.
 * @param {object} product - The product data object.
 * @returns {string} The HTML string for the product card.
 */
export function ProductCard(product) {
  if (!product) {
    console.error('ProductCard: No product data provided');
    return '';
  }
  
  // Check user authentication status
  const { isAuthenticated, user } = store.getState()
  
  // Handle backend data structure
  const finalPrice = product.final_price || product.price
  const originalPrice = product.price
  const hasDiscount = (product.discount_percentage || 0) > 0
  const categoryName = product.category?.name || product.category || 'Uncategorized'
  // Use original slug from backend - no modification
  const productSlug = product.slug || product.id;
  
  const productId = product.id || product.slug
  const rating = product.average_rating || product.rating || 0
  const reviewsCount = product.total_reviews || product.reviews_count || 0
  const isInStock = product.in_stock !== undefined ? product.in_stock : (product.stock || 0) > 0

  // Use original image data from backend without modification
  let imageUrl = '/placeholder.jpg'
  
  // Use backend image structure as-is
  if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
    imageUrl = product.image_urls[0]
  } else if (product.image_url) {
    imageUrl = product.image_url
  } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    const firstImage = product.images[0]
    imageUrl = firstImage.image || firstImage.url || firstImage
  }
  
  // Log only if image is missing
  if (imageUrl === '/placeholder.jpg') {
    console.warn(`Product ${product.name} using placeholder - no valid images found:`, {
      image_urls: product.image_urls,
      image_url: product.image_url,
      images: product.images
    });
  }


  return `
    <div class="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-300 group cursor-pointer overflow-hidden" onclick="location.hash='/products/${productSlug}'">
      <!-- Product Image -->
      <div class="relative overflow-hidden">
        <img src="${imageUrl}"
             alt="${product.name}"
             class="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
             onerror="this.src='/placeholder.jpg'; this.onerror=null;">

        <!-- Discount Badge -->
        ${hasDiscount ? `
          <div class="absolute top-3 left-3 bg-danger text-white px-2 py-1 rounded-full text-xs font-bold">
            -${Math.round(product.discount_percentage)}%
          </div>
        ` : ''}

        <!-- Action Buttons -->
        <div class="product-card-actions">
          ${isAuthenticated ? `
            <button class="action-button ${product.is_liked ? 'wishlist-active' : ''}"
                    onclick="event.stopPropagation(); toggleWishlist('${productSlug}', event)"
                    title="Add to Wishlist"
                    aria-label="Add ${product.name} to wishlist">
              <i class="fa-solid fa-heart ${product.is_liked ? 'text-red-500' : ''}"></i>
            </button>
            <button class="action-button"
                    onclick="event.stopPropagation(); addToCart('${productSlug}', event)"
                    title="Add to Cart"
                    aria-label="Add ${product.name} to cart">
              <i class="fa-solid fa-shopping-cart"></i>
            </button>
            <button class="action-button"
                    onclick="event.stopPropagation(); quickView('${productSlug}', event)"
                    title="Quick View"
                    aria-label="View ${product.name} details">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="action-button"
                    onclick="event.stopPropagation(); compareProduct('${productId}', event)"
                    title="Compare"
                    aria-label="Compare ${product.name}">
              <i class="fa-solid fa-code-compare"></i>
            </button>
          ` : `
            <button class="action-button opacity-50 cursor-not-allowed"
                    onclick="event.stopPropagation(); requireLogin('wishlist')"
                    title="Login required"
                    aria-label="Login required to add to wishlist">
              <i class="fa-solid fa-heart"></i>
            </button>
            <button class="action-button opacity-50 cursor-not-allowed"
                    onclick="event.stopPropagation(); requireLogin('cart')"
                    title="Login required"
                    aria-label="Login required to add to cart">
              <i class="fa-solid fa-shopping-cart"></i>
            </button>
            <button class="action-button opacity-50 cursor-not-allowed"
                    onclick="event.stopPropagation(); requireLogin('view')"
                    title="Login required"
                    aria-label="Login required for quick view">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="action-button opacity-50 cursor-not-allowed"
                    onclick="event.stopPropagation(); requireLogin('compare')"
                    title="Login required"
                    aria-label="Login required to compare">
              <i class="fa-solid fa-code-compare"></i>
            </button>
          `}
        </div>
      </div>

      <!-- Product Info -->
      <div class="p-4 space-y-3">
        <!-- Category -->
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-secondary bg-secondary bg-opacity-10 px-2 py-1 rounded-full">
            ${categoryName}
          </span>
          ${isInStock ?
            '<span class="text-xs text-success font-medium">In Stock</span>' :
            '<span class="text-xs text-danger font-medium">Out of Stock</span>'
          }
        </div>

        <!-- Product Name -->
        <h3 class="font-semibold text-gray-800 group-hover:text-secondary transition-colors line-clamp-2 leading-tight">
          ${product.name}
        </h3>

        <!-- Rating -->
        ${rating > 0 ? `
          <div class="flex items-center gap-2">
            <div class="flex text-yellow-400 text-sm">
              ${Array.from({length: 5}, (_, i) => `
                <i class="fa-solid fa-star ${i < Math.floor(rating) ? '' : 'text-gray-300'}"></i>
              `).join('')}
            </div>
            <span class="text-xs text-gray-500">${rating.toFixed(1)}</span>
            <span class="text-xs text-gray-400">(${reviewsCount})</span>
          </div>
        ` : ''}

        <!-- Price -->
        <div class="flex items-center justify-between pt-2">
          <div class="flex flex-col">
            ${hasDiscount ? `
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-secondary">${formatCurrency(finalPrice)}</span>
                <span class="text-sm text-gray-500 line-through">${formatCurrency(originalPrice)}</span>
              </div>
            ` : `
              <span class="text-lg font-bold text-gray-800">${formatCurrency(finalPrice)}</span>
            `}
          </div>
        </div>
      </div>
    </div>
  `
}

// Helper functions for product card interactions
async function getProductIdFromSlug(slug) {
  try {
    // Validate input
    if (!slug) {
      throw new Error('Slug is required');
    }

    // If slug is actually an ID, return it
    if (!isNaN(slug)) {
      return parseInt(slug)
    }

    // Try to get from current product data first
    const currentProduct = window.currentProduct
    if (currentProduct && currentProduct.slug === slug) {
      return currentProduct.id
    }

    // Try to get from cached products data with enhanced matching
    if (window.allNewArrivals && Array.isArray(window.allNewArrivals)) {
      const cachedProduct = window.allNewArrivals.find(p => 
        p.slug === slug || p.id === slug || String(p.id) === slug
      );
      if (cachedProduct && cachedProduct.id) {
        return cachedProduct.id;
      }
    }

    if (window.allRecommendations && Array.isArray(window.allRecommendations)) {
      const cachedProduct = window.allRecommendations.find(p => 
        p.slug === slug || p.id === slug || String(p.id) === slug
      );
      if (cachedProduct && cachedProduct.id) {
        return cachedProduct.id;
      }
    }

    // Fallback: fetch product by slug
    const { productService } = await import('../services/api.js')
    const product = await productService.getProductById(slug)
    if (!product || !product.id) {
      throw new Error(`Product not found for slug: ${slug}`);
    }
    return product.id
  } catch (error) {
    console.error('Failed to get product ID for slug:', slug, error)
    // Return slug as fallback if it looks like a number
    if (!isNaN(slug)) {
      return parseInt(slug);
    }
    throw error
  }
}

function getOrCreateSessionId() {
  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
    localStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

function updateWishlistCounter() {
  // Update wishlist badge
  const wishlistBadges = document.querySelectorAll('.wishlist-badge')
  wishlistBadges.forEach(badge => {
    const currentCount = parseInt(badge.textContent) || 0
    badge.textContent = currentCount + 1
    badge.style.display = 'block'
  })
}

function updateCartCounter() {
  if (window.cart) {
    window.cart.loadCart()
  } else {
    // Update cart badge manually
    const cartBadges = document.querySelectorAll('.cart-badge')
    cartBadges.forEach(badge => {
      const currentCount = parseInt(badge.textContent) || 0
      badge.textContent = currentCount + 1
      badge.style.display = 'block'
    })
  }
}

// Utility functions for product card interactions
window.toggleWishlist = async function(productSlug, event = null) {
  let button = null
  let originalContent = null

  try {
    // Add loading state to button
    if (event) {
      button = event.target.closest('button')
      originalContent = button.innerHTML
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'
      button.disabled = true
    }

    // Import store to check authentication
    const store = await import('../state/store.js')
    const { isAuthenticated } = store.default.getState()

    if (!isAuthenticated) {
      showToast('Please login to add items to wishlist', 'warning')
      location.hash = '/login'
      return
    }

    // Get product ID from slug with enhanced error handling
    const productId = await getProductIdFromSlug(productSlug)

    // Import cart service dynamically to avoid circular dependencies
    const { cartService } = await import('../services/api.js')

    const response = await cartService.saveItem(productId)

    if (response.success || response.message) {
      showToast('Added to wishlist!', 'success')
      updateWishlistCounter()

      // Update the heart icon to show it's liked
      if (button) {
        button.innerHTML = '<i class="fa-solid fa-heart text-red-500"></i>'
        button.title = 'Added to Wishlist'
        button.classList.add('wishlist-active', 'success')

        // Remove success animation after it completes
        setTimeout(() => {
          button.classList.remove('success')
        }, 600)
      }
    } else {
      throw new Error(response.error || 'Failed to add to wishlist')
    }
  } catch (error) {
    console.error('Failed to add to wishlist:', error)
    const errorMessage = error.message || 'Failed to add to wishlist'
    showToast(errorMessage, 'error')

    // Show error state briefly
    if (button && originalContent) {
      button.classList.add('error')
      button.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i>'

      setTimeout(() => {
        button.innerHTML = originalContent
        button.disabled = false
        button.classList.remove('error')
      }, 1500)
    }
  } finally {
    // Re-enable button if not permanently changed
    if (button && !button.innerHTML.includes('text-red-500')) {
      button.disabled = false
      if (originalContent) {
        button.innerHTML = originalContent
      }
    }
  }
}

window.addToCart = async function(productSlug, event = null) {
  let button = null
  let originalContent = null

  try {
    // Add loading state to button
    if (event) {
      button = event.target.closest('button')
      originalContent = button.innerHTML
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'
      button.disabled = true
    }

    // Get product ID from slug with enhanced error handling
    const productId = await getProductIdFromSlug(productSlug)

    // Check if cart component is available
    if (window.cart) {
      await window.cart.addToCart(productId, 1)
    } else {
      // Fallback to direct API call
      const { cartService } = await import('../services/api.js')
      const store = await import('../state/store.js')
      const { isAuthenticated } = store.default.getState()

      // Get session ID for guest users
      const sessionId = isAuthenticated ? null : getOrCreateSessionId()

      const response = await cartService.addToCart(productId, 1, sessionId)

      if (response.success || response.message || response.cart) {
        showToast('Added to cart!', 'success')
        updateCartCounter()

        // Show success state briefly
        if (button) {
          button.innerHTML = '<i class="fa-solid fa-check text-green-500"></i>'
          button.classList.add('cart-success', 'success')

          setTimeout(() => {
            if (originalContent) {
              button.innerHTML = originalContent
              button.classList.remove('cart-success', 'success')
            }
          }, 1500)
        }
      } else {
        throw new Error(response.error || 'Failed to add to cart')
      }
    }
  } catch (error) {
    console.error('Failed to add to cart:', error)
    const errorMessage = error.message || 'Failed to add to cart'
    showToast(errorMessage, 'error')

    // Show error state briefly
    if (button && originalContent) {
      button.classList.add('error')
      button.innerHTML = '<i class="fa-solid fa-exclamation-triangle"></i>'

      setTimeout(() => {
        button.innerHTML = originalContent
        button.disabled = false
        button.classList.remove('error')
      }, 1500)
    }
  } finally {
    // Re-enable button
    if (button) {
      button.disabled = false
      // Only restore content if it wasn't changed to success state
      if (button.innerHTML.includes('fa-spinner') && originalContent) {
        button.innerHTML = originalContent
      }
    }
  }
}

window.quickView = function(productSlug, event = null) {
  try {
    // Add loading state to the button if event is provided
    if (event) {
      const button = event.target.closest('button')
      const originalContent = button.innerHTML
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'
      button.disabled = true

      // Reset button after a short delay (in case navigation is slow)
      setTimeout(() => {
        button.innerHTML = originalContent
        button.disabled = false
      }, 1000)
    }

    // Navigate to product detail page
    location.hash = `/products/${productSlug}`
  } catch (error) {
    console.error('Failed to navigate to product:', error)
    showToast('Failed to open product details', 'error')
  }
}

// Function to handle login requirement for guests
window.requireLogin = function(action) {
  let message = 'Please login to continue'
  
  switch(action) {
    case 'wishlist':
      message = 'Please login to add items to your wishlist'
      break
    case 'cart':
      message = 'Please login to add items to your cart'
      break
    case 'view':
      message = 'Please login to view product details'
      break
    case 'compare':
      message = 'Please login to compare products'
      break
  }
  
  showToast(message, 'warning')
  
  // Redirect to login page after a short delay
  setTimeout(() => {
    location.hash = '/login'
  }, 1500)
}
