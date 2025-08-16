import { createElementFromHTML, showToast } from "../utils/helpers.js"
import { cartService } from "../services/api.js" // Make sure this path is correct
import { ProductCard } from "../components/ProductCard.js"
import { LoadingSpinner } from "../components/LoadingSpinner.js"
import store from "../state/store.js"

export default function WishlistPage() {
  const page = createElementFromHTML(`
    <div class="container mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold text-primary mb-6 text-center">Favorites</h1>
      <div id="wishlist-items" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        ${LoadingSpinner('lg', 'Loading your wishlist...').outerHTML}
      </div>
      <div id="empty-wishlist-message" class="hidden text-center py-12">
        <i class="fa-solid fa-heart-crack text-gray-400 text-6xl mb-4"></i>
        <p class="text-xl text-gray-600 font-semibold">Your favorites list is empty!</p>
        <p class="text-gray-500 mt-2">Start adding products you love to your favorites.</p>
        <a href="#/products" class="btn btn-primary mt-6">Browse Products</a>
      </div>
    </div>
  `)

  const wishlistItemsContainer = page.querySelector('#wishlist-items')
  const emptyWishlistMessage = page.querySelector('#empty-wishlist-message')

  const fetchWishlist = async () => {
    wishlistItemsContainer.innerHTML = LoadingSpinner('lg', 'Loading your wishlist...').outerHTML
    emptyWishlistMessage.classList.add('hidden')

    const state = store.getState()
    // It's crucial that state.isAuthenticated is correctly updated upon login/logout.
    if (!state.isAuthenticated) {
      showToast('Please log in to view your favorites.', 'info')

      wishlistItemsContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <i class="fa-solid fa-user-lock text-gray-400 text-6xl mb-4"></i>
          <p class="text-xl text-gray-600 font-semibold">Please log in to view your favorites.</p>
          <p class="text-gray-500 mt-2">Log in or create an account to save your favorite items.</p>
          <a href="#/login" class="btn btn-primary mt-6">Log In</a>
        </div>
      `
      return
    }

    try {
      // جلب العناصر المحفوظة من الخدمة
      let wishlistItems = await cartService.getSavedItems()
      // التأكد أن wishlistItems مصفوفة
      if (!Array.isArray(wishlistItems)) {
        if (Array.isArray(wishlistItems.items)) {
          wishlistItems = wishlistItems.items
        } else if (Array.isArray(wishlistItems.results)) {
          wishlistItems = wishlistItems.results
        } else {
          wishlistItems = []
        }
      }
      // مراقبة البيانات
      console.log('Wishlist data:', wishlistItems)

      if (wishlistItems.length === 0) {
        wishlistItemsContainer.innerHTML = ''
        emptyWishlistMessage.classList.remove('hidden')
      } else {
        wishlistItemsContainer.innerHTML = ''
        wishlistItems.forEach(savedItem => {
          // Access the 'product' property nested within each savedItem
          const product = savedItem.product
          // تأكد أن ProductCard يرجع عنصر DOM وليس نص فقط
          let productCard = ProductCard(product)
          if (typeof productCard === 'string') {
            productCard = createElementFromHTML(productCard)
          }

          const removeBtn = createElementFromHTML(`
            <button class="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md text-danger hover:scale-110 transition-transform" title="Remove from Favorites">
              <i class="fa-solid fa-xmark"></i>
            </button>
          `)

          // Hide default action buttons on the product card if they exist
          const productCardActions = productCard.querySelector('.product-card-actions')
          if (productCardActions) {
            productCardActions.classList.add('hidden')
          }

          removeBtn.onclick = async (e) => {
            e.stopPropagation()
            // Pass the product.id to the unsaveItem function
            await removeFromWishlist(product.id)
          }

          productCard.style.position = 'relative'
          productCard.appendChild(removeBtn)
          wishlistItemsContainer.appendChild(productCard)
        })
        emptyWishlistMessage.classList.add('hidden')
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error)
      showToast('Failed to load wishlist.', 'error')
      wishlistItemsContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <i class="fa-solid fa-exclamation-triangle text-danger text-6xl mb-4"></i>
          <p class="text-xl text-danger font-semibold">Failed to load wishlist.</p>
          <p class="text-gray-500 mt-2">Please try again later.</p>
        </div>
      `
    }
  }

  const removeFromWishlist = async (productId) => {
    try {
      await cartService.unsaveItem(productId)
      showToast('Product removed from favorites!', 'success')
      fetchWishlist() // Re-fetch wishlist to update UI
    } catch (error) {
      console.error('Error removing from wishlist:', error)
      showToast('Failed to remove product from favorites.', 'error')
    }
  }

  // Initial fetch when the page is loaded/rendered
  fetchWishlist()

  return page
}