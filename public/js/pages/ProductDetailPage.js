import { createElementFromHTML, showToast, formatCurrency } from "../utils/helpers.js?v=2024"
import { productService } from "../services/api.js"
import { ProductCard } from "../components/ProductCard.js"
import { SkeletonProductDetail, SkeletonCards } from "../components/LoadingSpinner.js"
import store from "../state/store.js"

export default function ProductDetailPage(params) {
  const page = createElementFromHTML(`
        <div class="min-h-screen bg-gray-50">
            <!-- Breadcrumb -->
            <div class="bg-white border-b">
                <div class="container mx-auto py-4 px-4">
                    <nav class="flex items-center space-x-2 text-sm">
                        <a href="#/" class="text-secondary hover:text-primary transition-colors">
                            <i class="fa-solid fa-home mr-1"></i>
                            Home
                        </a>
                        <i class="fa-solid fa-chevron-right text-gray-400"></i>
                        <a href="#/products" class="text-secondary hover:text-primary transition-colors">Products</a>
                        <i class="fa-solid fa-chevron-right text-gray-400"></i>
                        <span class="text-gray-600" id="breadcrumb-product">Loading...</span>
                    </nav>
                </div>
            </div>

            <!-- Main Content -->
            <div class="container mx-auto py-8 px-4">
                <div id="product-content">
                    <!-- Loading skeleton will be inserted here -->
                </div>
            </div>
        </div>
    `)

  // Show loading skeleton
  const productContent = page.querySelector('#product-content')
  productContent.appendChild(SkeletonProductDetail())

  // Load product details
  loadProductDetails(page, params.id)


  return page
}

async function loadProductDetails(page, productId) {
  try {
    const product = await productService.getProductById(productId)
    renderProductDetails(page, product)
    loadSimilarProducts(page, productId)
  } catch (error) {
    page.querySelector('#product-content').innerHTML = `
      <div class="text-center">
        <h1 class="text-2xl font-bold text-danger mb-4">Product Not Found</h1>
        <p class="text-muted mb-4">The product you're looking for doesn't exist.</p>
        <a href="#/products" class="btn btn-primary">Browse All Products</a>
      </div>
    `
  }
}

function renderProductDetails(page, product) {
  // Check user authentication status
  const { isAuthenticated, user } = store.getState()
  
  // Handle backend data structure
  const finalPrice = product.final_price || product.price
  const originalPrice = product.price
  const hasDiscount = (product.discount_percentage || 0) > 0
  const categoryName = product.category?.name || product.category || 'Uncategorized'
  // Ensure correct review count and rating
  const reviewsCount = product.total_reviews ?? product.reviews_count ?? (Array.isArray(product.reviews) ? product.reviews.length : 0);
  let rating = 0;
  if (product.average_rating !== undefined && product.average_rating !== null) {
    rating = product.average_rating;
  } else if (product.rating !== undefined && product.rating !== null) {
    rating = product.rating;
  } else if (Array.isArray(product.reviews) && product.reviews.length > 0) {
    rating = product.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / product.reviews.length;
  }
  const isInStock = product.in_stock !== undefined ? product.in_stock : (product.stock || 0) > 0

  // Get images - handle both image_urls array and images objects
  let imageUrls = []
  if (product.image_urls && product.image_urls.length > 0) {
    imageUrls = product.image_urls
  } else if (product.images && product.images.length > 0) {
    imageUrls = product.images.map(img => img.image || img.url || img)
  }
  // Always ensure at least one placeholder if no images
  if (!imageUrls || imageUrls.length === 0) {
    imageUrls = ['/placeholder.jpg']
  }

  // Update breadcrumb
  const breadcrumbProduct = page.querySelector('#breadcrumb-product')
  if (breadcrumbProduct) {
    breadcrumbProduct.textContent = product.name
  }

  // قسم الرفيو الحديث
  const reviewsSection = `
    <div class="bg-white rounded-lg shadow-sm border p-8 mb-8">
      <h2 class="text-2xl font-bold text-primary mb-4">
        <i class="fa-solid fa-comments text-secondary mr-2"></i>
        Reviews
      </h2>
      ${isAuthenticated ? `
        <form id="add-review-form" class="mb-6">
          <div class="flex gap-4 mb-3">
            <select id="review-rating" class="form-select w-32">
              <option value="5">★★★★★</option>
              <option value="4">★★★★</option>
              <option value="3">★★★</option>
              <option value="2">★★</option>
              <option value="1">★</option>
            </select>
            <input id="review-comment" type="text" class="form-input flex-1" placeholder="Write your review..." required>
          </div>
          <div id="sentiment-result" class="text-xs text-gray-500 mb-2"></div>
          <button type="submit" class="btn btn-primary">Submit Review</button>
        </form>
      ` : `
        <div class="mb-6 p-4 bg-gray-50 rounded-lg border">
          <p class="text-gray-600 mb-3">
            <i class="fa-solid fa-info-circle text-secondary mr-2"></i>
            Please login to write a review
          </p>
          <button class="btn btn-primary" onclick="requireLogin('review')">
            <i class="fa-solid fa-sign-in-alt mr-2"></i>
            Login to Review
          </button>
        </div>
      `}
      <div id="reviews-list">
        <div id="reviews-skeleton" class="animate-pulse">
          <div class="bg-gray-100 rounded-lg p-4 border mb-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-semibold bg-gray-300 text-transparent rounded w-24 h-4"></span>
              <span class="text-xs bg-gray-300 text-transparent rounded w-16 h-4"></span>
              <span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-300 text-transparent w-12 h-4"></span>
              <span class="ml-auto bg-gray-300 text-transparent rounded w-20 h-4"></span>
            </div>
            <div class="bg-gray-200 rounded h-4 mb-2 w-3/4"></div>
            <div class="bg-gray-200 rounded h-3 w-1/4"></div>
          </div>
          <div class="bg-gray-100 rounded-lg p-4 border mb-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-semibold bg-gray-300 text-transparent rounded w-24 h-4"></span>
              <span class="text-xs bg-gray-300 text-transparent rounded w-16 h-4"></span>
              <span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-300 text-transparent w-12 h-4"></span>
              <span class="ml-auto bg-gray-300 text-transparent rounded w-20 h-4"></span>
            </div>
            <div class="bg-gray-200 rounded h-4 mb-2 w-3/4"></div>
            <div class="bg-gray-200 rounded h-3 w-1/4"></div>
          </div>
        </div>
        <button id="show-more-reviews" class="btn btn-outline w-full mt-2" style="display:none;">عرض المزيد من المراجعات</button>
      </div>
    </div>
  `;

  const content = `
    <!-- Product Details Card -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
      <div class="grid grid-cols-1 lg:grid-cols-2">
        <!-- Product Images -->
        <div class="p-8 flex flex-col items-center justify-center">
          <div class="relative w-full max-w-md">
            <img id="main-image" src="${imageUrls[0]}" alt="${product.name}" class="w-full h-96 object-contain rounded-lg shadow-lg transition-all duration-300" onerror="this.src='/placeholder.jpg'; this.onerror=null;">
            <div id="image-loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-lg hidden">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
            </div>
            <div class="absolute bottom-4 right-4 bg-secondary text-white px-3 py-1 rounded-full text-xs font-bold shadow">${categoryName}</div>
            <div class="absolute top-4 left-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-bold shadow">${isInStock ? 'In Stock' : 'Out of Stock'}</div>
            <div class="absolute bottom-4 left-4 bg-gray-800 text-white px-3 py-1 rounded-full text-xs shadow">${imageUrls.length} Images</div>
            <div class="absolute top-4 right-4 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs shadow">${product.sku || ''}</div>
          </div>
          <div class="flex gap-2 mt-4 w-full justify-center">
            ${imageUrls.map((url, idx) => `<div class="thumbnail-container border-2 border-gray-200 rounded-lg cursor-pointer transition-all duration-200" onclick="changeMainImage('${url}', ${idx}, this)"><img src="${url}" alt="${product.name}" class="thumbnail-image w-16 h-16 object-cover rounded-lg" onerror="this.src='/placeholder.jpg'; this.onerror=null;"></div>`).join('')}
          </div>
          <div class="mt-2 text-xs text-gray-500 text-center">صورة <span id="current-image-index">1</span> من ${imageUrls.length}</div>
        </div>
        <!-- Product Info -->
        <div class="p-8 flex flex-col justify-between">
          <h1 class="text-3xl font-bold text-primary mb-2">${product.name}</h1>
          <div class="flex items-center gap-3 mb-4">
            <span class="text-lg font-bold text-secondary">${formatCurrency(finalPrice)}</span>
            ${hasDiscount ? `<span class="text-sm line-through text-gray-400">${formatCurrency(originalPrice)}</span><span class="ml-2 text-xs bg-danger text-white px-2 py-1 rounded-full">-${product.discount_percentage}%</span>` : ''}
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-yellow-400">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5-Math.round(rating))}</span>
            <span class="text-xs text-gray-500">(${reviewsCount} reviews)</span>
          </div>
          <div class="mb-4 text-gray-700">${product.description || ''}</div>
          <div class="flex items-center gap-4 mb-4">
            ${isAuthenticated ? `
              <button class="btn btn-primary" onclick="addToCart('${product.slug}')"><i class="fa-solid fa-shopping-cart mr-2"></i> Add to Cart</button>
              <button class="btn btn-outline" onclick="addToWishlist('${product.slug}')"><i class="fa-solid fa-heart mr-2"></i> Add to Wishlist</button>
              <button class="btn btn-outline" onclick="shareProduct()"><i class="fa-solid fa-share-nodes mr-2"></i> Share</button>
            ` : `
              <button class="btn btn-primary opacity-50 cursor-not-allowed" onclick="requireLogin('cart')"><i class="fa-solid fa-shopping-cart mr-2"></i> Login to Add to Cart</button>
              <button class="btn btn-outline opacity-50 cursor-not-allowed" onclick="requireLogin('wishlist')"><i class="fa-solid fa-heart mr-2"></i> Login to Add to Wishlist</button>
              <button class="btn btn-outline" onclick="shareProduct()"><i class="fa-solid fa-share-nodes mr-2"></i> Share</button>
            `}
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="mb-4 text-gray-700">Brand:</span>
            <span class="text-lg font-bold text-secondary"> ${product.brand?.name || product.brand || '-'}</span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="mb-4 text-gray-700">Store:</span>
            <span class="text-lg font-bold text-secondary"> ${product.store?.name || product.store || '-'}</span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs text-gray-500">SKU: ${product.sku || '-'}</span>
            <span class="text-xs text-gray-500">Stock: ${product.stock || '-'}</span>
          </div>
        </div>
      </div>
    </div>
    ${reviewsSection}
    <!-- Similar Products -->
    <div class="bg-white rounded-lg shadow-sm border p-8 mt-8" id="similar-products">
      <h2 class="text-xl font-bold text-primary mb-4"><i class="fa-solid fa-robot text-secondary mr-2"></i> منتجات مشابهة بالذكاء الاصطناعي</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="similar-products-list">
        <!-- سيتم تحميل المنتجات المشابهة هنا -->
      </div>
    </div>
  `


  page.querySelector('#product-content').innerHTML = content

  // تحميل وعرض المراجعات
  loadProductReviews(product.slug)

  // إضافة معالجة نموذج المراجعة
  const reviewForm = page.querySelector('#add-review-form')
  if (reviewForm) {
    reviewForm.addEventListener('submit', async function(e) {
      e.preventDefault()
      const rating = parseInt(page.querySelector('#review-rating').value)
      const comment = page.querySelector('#review-comment').value.trim()
      if (!comment) {
        showToast('يرجى كتابة تعليقك أولاً.', 'warning')
        return
      }
      // تحليل الشعور
      const sentiment = await analyzeSentiment(comment)
      page.querySelector('#sentiment-result').textContent = `Sentiment: ${sentiment}`
      // إرسال المراجعة للباك
      const success = await submitProductReview(product.slug, rating, comment, sentiment)
      if (success) {
        showToast('تم إرسال المراجعة بنجاح!', 'success')
        loadProductReviews(product.slug)
        reviewForm.reset()
        page.querySelector('#sentiment-result').textContent = ''
      } else {
        showToast('فشل إرسال المراجعة.', 'error')
      }
    })
    page.querySelector('#review-comment').addEventListener('input', async function(e) {
      const comment = e.target.value.trim()
      if (comment.length > 10) {
        const sentiment = await analyzeSentiment(comment)
        page.querySelector('#sentiment-result').textContent = `Sentiment: ${sentiment}`
      } else {
        page.querySelector('#sentiment-result').textContent = ''
      }
    })
  }

  // دالة تحميل المراجعات من الباك
  async function loadProductReviews(productId) {
    const reviewsList = document.querySelector('#reviews-list')
    if (!reviewsList) return
    // Show skeleton while loading
    const reviewsSkeleton = document.getElementById('reviews-skeleton')
    if (reviewsSkeleton) reviewsSkeleton.style.display = 'block'
    try {
      const data = await productService.getProductReviews(productId)
      // Hide skeleton after loading
      const reviewsSkeleton = document.getElementById('reviews-skeleton')
      if (reviewsSkeleton) reviewsSkeleton.style.display = 'none'
      if (!data || !data.results || data.results.length === 0) {
        reviewsList.innerHTML = '<div class="text-center text-muted">لا توجد مراجعات بعد.</div>'
        return
      }
      // Sort reviews by date descending
      const sortedReviews = data.results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      // Show only the latest 3 reviews by default
      let showingAll = false;
      function renderReviews() {
        const reviewsToShow = showingAll ? sortedReviews : sortedReviews.slice(0, 3);
        reviewsList.innerHTML = reviewsToShow.map(review => {
          let role = review.user_type === 'owner' || review.is_owner ? 'Owner' : 'Customer';
          return `
            <div class="bg-gray-50 rounded-lg p-4 border mb-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="font-semibold text-primary">${review.user_name || 'Anonymous'}</span>
                <span class="text-xs text-gray-500">${new Date(review.created_at).toLocaleDateString()}</span>
                <span class="px-2 py-1 rounded-full text-xs font-bold ${role === 'Owner' ? 'bg-secondary text-white' : 'bg-gray-200 text-gray-700'}">${role}</span>
                <span class="ml-auto text-yellow-400">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
              </div>
              <div class="text-gray-700 mb-2">${review.comment}</div>
              <div class="text-xs text-gray-500">Sentiment: ${review.sentiment || 'N/A'}</div>
            </div>
          `;
        }).join('');
        // Show/hide the button
        const showMoreBtn = document.getElementById('show-more-reviews');
        if (sortedReviews.length > 3 && !showingAll) {
          if (showMoreBtn) showMoreBtn.style.display = 'block';
        } else {
          if (showMoreBtn) showMoreBtn.style.display = 'none';
        }
      }
      renderReviews();
      // Add event listener for show more button
      const showMoreBtn = document.getElementById('show-more-reviews');
      if (showMoreBtn) {
        showMoreBtn.onclick = function() {
          showingAll = true;
          renderReviews();
        };
      }
    } catch (error) {
      // Hide skeleton on error
      const reviewsSkeleton = document.getElementById('reviews-skeleton')
      if (reviewsSkeleton) reviewsSkeleton.style.display = 'none'
      console.error('فشل تحميل المراجعات:', error)
      let errorMsg = 'فشل تحميل المراجعات.'
      if (error && error.message) {
        errorMsg += `<br><span class='text-xs text-muted'>${error.message}</span>`
      }
      reviewsList.innerHTML = `<div class="text-center text-danger">${errorMsg}</div>`
    }
  }

  // إرسال مراجعة جديدة
  async function submitProductReview(productId, rating, comment, sentiment) {
    try {
      const data = await productService.createProductReview(productId, { rating, comment, sentiment })
      if (data && (data.success === true || data.id || data.pk)) {
        showToast('تم إرسال المراجعة بنجاح! شكراً لمساهمتك في تحسين تجربة المنتجات.', 'success');
        return true;
      }
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        showToast('تم إرسال المراجعة بنجاح! شكراً لمساهمتك في تحسين تجربة المنتجات.', 'success');
        return true;
      }
      showToast('حدث خطأ غير متوقع أثناء إرسال المراجعة.', 'error');
      return false;
    } catch (error) {
      if (error && error.message && error.message.includes('مراجعة لنفس المنتج')) {
        showToast('لا يمكنك إضافة أكثر من مراجعة لنفس المنتج. يمكنك تعديل مراجعتك السابقة فقط.', 'warning');
      } else if (error && error.message) {
        showToast(`فشل إرسال المراجعة: ${error.message}`, 'error');
      } else {
        showToast('فشل إرسال المراجعة. حاول مرة أخرى لاحقاً.', 'error');
      }
      return false;
    }
  }

  // تحليل الشعور
  async function analyzeSentiment(text) {
    try {
      // Ensure API_BASE_URL is used for backend requests
      let apiBase = '';
      if (typeof window !== 'undefined' && window.API_BASE_URL) {
        apiBase = window.API_BASE_URL;
      } else if (typeof API_BASE_URL !== 'undefined') {
        apiBase = API_BASE_URL;
      } else {
        apiBase = 'http://localhost:8000';
      }
      // Remove trailing slash if present
      if (apiBase.endsWith('/')) apiBase = apiBase.slice(0, -1);
      const response = await fetch(`${apiBase}/api/products/analyze-sentiment/`, {
        method: 'POST',
        headers: (() => {
          const headers = { 'Content-Type': 'application/json' };
          // Try to get token from localStorage (adjust if you use cookies or another storage)
          const token = localStorage.getItem('token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          return headers;
        })(),
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      return data.sentiment || 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  // Store current product data globally for cart/wishlist functions
  window.currentProduct = product

  // Initialize image gallery functionality
  initializeImageGallery(imageUrls)

  // Add global functions for interactions

  // Cart and wishlist functionality will be handled by global functions below

  window.shareProduct = function() {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      })
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      showToast("Product link copied to clipboard!", "success")
    }
  }
}

async function loadSimilarProducts(page, productId) {
  const container = page.querySelector('#similar-products')
  if (!container) return;
  const startTime = performance.now()

  // Show loading skeleton
  container.innerHTML = ''
  container.appendChild(SkeletonCards(4))

  try {
    const data = await productService.getSimilarProducts(productId)
    console.log('Similar products response:', data) // Debug log

    // Extract similar products from the response
    const similarProducts = data.similar_products || data.results || data

    // Performance tracking
    const loadTime = performance.now() - startTime
    console.log(`Similar products loaded in ${loadTime.toFixed(2)}ms`)

    // Clear loading skeleton
    container.innerHTML = ''

    if (!similarProducts || similarProducts.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-8">
          <div class="text-4xl text-muted mb-4">
            <i class="fa-solid fa-search"></i>
          </div>
          <p class="text-muted">No similar products found.</p>
        </div>
      `
    } else {
      // Create optimized similar product cards
      container.innerHTML = similarProducts.slice(0, 4).map(createSimilarProductCard).join('')

      // Track recommendation display
      trackRecommendationDisplay(productId, similarProducts.slice(0, 4))
    }
  } catch (error) {
    console.error('Error loading similar products:', error)
    container.innerHTML = `
      <div class="col-span-full text-center py-8">
        <div class="text-4xl text-danger mb-4">
          <i class="fa-solid fa-exclamation-triangle"></i>
        </div>
        <h3 class="text-lg font-semibold text-danger mb-2">Could not load recommendations</h3>
        <p class="text-gray-600 mb-4">Our AI recommendation engine is temporarily unavailable.</p>
        <div class="flex gap-3 justify-center">
          <button class="btn btn-outline" onclick="loadSimilarProducts(document.querySelector('#product-detail'), '${productId}')">
            <i class="fa-solid fa-refresh mr-2"></i>
            Try Again
          </button>
          <a href="#/products" class="btn btn-secondary">
            <i class="fa-solid fa-search mr-2"></i>
            Browse Products
          </a>
        </div>
      </div>
    `
  }
}

// Create optimized similar product card
function createSimilarProductCard(similarProduct) {
  // استخدم صورة محلية افتراضية إذا لم تتوفر صورة للمنتج المشابه
  const imageUrl = similarProduct.image_urls && similarProduct.image_urls.length > 0
    ? similarProduct.image_urls[0]
    : (similarProduct.images && similarProduct.images.length > 0
        ? (similarProduct.images[0].image || similarProduct.images[0].url || similarProduct.images[0])
        : '/placeholder.jpg')
  const formattedPrice = formatCurrency(similarProduct.price)
  const rating = Math.round(similarProduct.rating * 10) / 10
  const stars = generateStarRating(rating)

  return `
    <div class="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-300 group cursor-pointer overflow-hidden flex flex-col min-w-[180px] max-w-[220px] mx-auto" style="width:100%;" onclick="loadSimilarProductDetails(${similarProduct.product_id})">
      <!-- Product Image -->
      <div class="relative overflow-hidden" style="height:120px;">
        <img src="${imageUrl}"
             alt="${similarProduct.name}"
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
             onerror="this.src='/placeholder.jpg'; this.onerror=null;">

        <!-- AI Recommendation Badge -->
        <div class="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
          <i class="fa-solid fa-robot mr-1"></i>
          AI Pick
        </div>

        <!-- Similarity Score -->
        <div class="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs">
          ${Math.round(similarProduct.score * 100)}% Match
        </div>

        <!-- Action Buttons -->
        <div class="absolute inset-0 bg-gray-900 bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button class="bg-white p-2 rounded-full shadow-md hover:bg-secondary hover:text-white transition-colors"
                  onclick="addToWishlist(${similarProduct.product_id}, event)"
                  title="Add to Wishlist">
            <i class="fa-solid fa-heart"></i>
          </button>
          <button class="bg-white p-2 rounded-full shadow-md hover:bg-secondary hover:text-white transition-colors"
                  onclick="quickAddToCart(${similarProduct.product_id}, event)"
                  title="Quick Add to Cart">
            <i class="fa-solid fa-shopping-cart"></i>
          </button>
        </div>
      </div>

      <!-- Product Info -->
      <div class="p-2 flex-1 flex flex-col justify-between">
        <h3 class="font-semibold text-gray-800 mb-1 line-clamp-2 group-hover:text-secondary transition-colors text-sm">
          ${similarProduct.name}
        </h3>

        <!-- Rating -->
        <div class="flex items-center gap-1 mb-1">
          <div class="flex text-yellow-400 text-xs">
            ${stars}
          </div>
          <span class="text-xs text-gray-500">(${rating})</span>
        </div>

        <!-- Price -->
        <div class="flex items-center justify-between mb-1">
          <span class="text-base font-bold text-secondary">${formattedPrice}</span>
          <span class="text-xs text-gray-500">
            ${similarProduct.algorithm === 'content_similarity' ? 'Similar' : 'Recommended'}
          </span>
        </div>

        <!-- Recommendation Reason -->
        <div class="mt-1 text-xs text-gray-600 bg-gray-50 px-1 py-1 rounded">
          <i class="fa-solid fa-lightbulb mr-1"></i>
          ${similarProduct.reason}
        </div>
      </div>
    </div>
  `
}

// Generate star rating HTML
function generateStarRating(rating) {
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

// Load similar product details
window.loadSimilarProductDetails = async function(productId) {
  try {
    // Show loading state
    showToast("Loading product details...", "info")

    // Get all products to find the one with this ID
    const productsData = await productService.getProducts()
    const product = productsData.results.find(p => p.id === productId)

    if (product) {
      location.hash = `/products/${product.slug}`
    } else {
      showToast("Product not found", "error")
    }
  } catch (error) {
    console.error('Error loading similar product:', error)
    showToast("Error loading product", "error")
  }
}

// Quick add to wishlist
window.addToWishlist = function(productId, event) {
  if (event) event.stopPropagation()
  showToast("Added to wishlist!", "success")
  // TODO: Implement actual wishlist functionality
}

// Quick add to cart
window.quickAddToCart = function(productId, event) {
  if (event) event.stopPropagation()
  showToast("Added to cart!", "success")
  // TODO: Implement actual cart functionality
}

// Track recommendation display for analytics
function trackRecommendationDisplay(sourceProductId, recommendations) {
  try {
    const trackingData = {
      source_product_id: sourceProductId,
      recommendations: recommendations.map(rec => ({
        product_id: rec.product_id,
        score: rec.score,
        algorithm: rec.algorithm,
        position: recommendations.indexOf(rec) + 1
      })),
      timestamp: new Date().toISOString(),
      session_id: generateSessionId()
    }

    console.log('Recommendation display tracked:', trackingData)
    // TODO: Send to analytics service
    // analyticsService.trackRecommendationDisplay(trackingData)
  } catch (error) {
    console.error('Error tracking recommendation display:', error)
  }
}

// Generate session ID for tracking
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
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
    case 'review':
      message = 'Please login to write a review'
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

// Image Gallery Functionality
let currentImageIndex = 0
let galleryImages = []

function initializeImageGallery(imageUrls) {
  galleryImages = imageUrls || []
  currentImageIndex = 0

  if (galleryImages.length <= 1) return

  // Add keyboard navigation
  document.addEventListener('keydown', handleKeyboardNavigation)

  // Add touch/swipe support for mobile
  addTouchSupport()

  // Preload images for better performance
  preloadImages()
}

function handleKeyboardNavigation(event) {
  if (event.key === 'ArrowLeft') {
    navigateImage(-1)
  } else if (event.key === 'ArrowRight') {
    navigateImage(1)
  }
}

function addTouchSupport() {
  const mainImage = document.getElementById('main-image')
  if (!mainImage) return

  let startX = 0
  let startY = 0

  mainImage.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
  })

  mainImage.addEventListener('touchend', (e) => {
    if (!startX || !startY) return

    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY

    const diffX = startX - endX
    const diffY = startY - endY

    // Only trigger if horizontal swipe is more significant than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        navigateImage(1) // Swipe left, go to next image
      } else {
        navigateImage(-1) // Swipe right, go to previous image
      }
    }

    startX = 0
    startY = 0
  })
}

function preloadImages() {
  galleryImages.forEach((url, index) => {
    if (index > 0) { // Skip first image as it's already loaded
      const img = new Image()
      img.src = url
    }
  })
}

// Navigate between images
window.navigateImage = function(direction) {
  if (galleryImages.length <= 1) return

  currentImageIndex += direction

  if (currentImageIndex >= galleryImages.length) {
    currentImageIndex = 0
  } else if (currentImageIndex < 0) {
    currentImageIndex = galleryImages.length - 1
  }

  const newImageUrl = galleryImages[currentImageIndex]
  changeMainImageWithAnimation(newImageUrl, currentImageIndex)
}

// Change main image with smooth animation
function changeMainImageWithAnimation(url, index) {
  const mainImage = document.getElementById('main-image')
  const loadingOverlay = document.getElementById('image-loading')
  const imageCounter = document.getElementById('current-image-index')

  if (!mainImage) return

  // Show loading state
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden')
  }

  // Create new image to preload
  const newImage = new Image()

  newImage.onload = function() {
    // Hide loading state
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden')
    }

    // Update main image with fade effect
    mainImage.style.opacity = '0'

    setTimeout(() => {
      mainImage.src = url
      mainImage.style.opacity = '1'

      // Update image counter
      if (imageCounter) {
        imageCounter.textContent = index + 1
      }

      // Update thumbnail selection
      updateThumbnailSelection(index)
    }, 150)
  }

  newImage.onerror = function() {
    // Hide loading state on error
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden')
    }

    // Set fallback image
    mainImage.src = `https://via.placeholder.com/600x600/f3f4f6/9ca3af?text=Image ${index + 1}`

    // Update counter anyway
    if (imageCounter) {
      imageCounter.textContent = index + 1
    }

    updateThumbnailSelection(index)
  }

  newImage.src = url
}

// Update thumbnail selection styling
function updateThumbnailSelection(activeIndex) {
  const thumbnails = document.querySelectorAll('.thumbnail-container')

  thumbnails.forEach((thumbnail, index) => {
    if (index === activeIndex) {
      thumbnail.classList.remove('border-gray-200')
      thumbnail.classList.add('border-secondary', 'shadow-md')
    } else {
      thumbnail.classList.remove('border-secondary', 'shadow-md')
      thumbnail.classList.add('border-gray-200')
    }
  })
}

// Enhanced change main image function
window.changeMainImage = function(url, index, thumbnailElement) {
  currentImageIndex = index
  changeMainImageWithAnimation(url, index)

  // Track image view for analytics
  trackImageView(index)
}

// Track image views for analytics
function trackImageView(imageIndex) {
  try {
    console.log(`Image ${imageIndex + 1} viewed`)
    // TODO: Send to analytics service
    // analyticsService.trackImageView({
    //   product_id: currentProductId,
    //   image_index: imageIndex,
    //   timestamp: new Date().toISOString()
    // })
  } catch (error) {
    console.error('Error tracking image view:', error)
  }
}

// Image Modal Functionality
window.openImageModal = function(imageUrl, productName) {
  if (!imageUrl) return

  const modal = createImageModal(imageUrl, productName)
  document.body.appendChild(modal)

  // Prevent body scroll
  document.body.style.overflow = 'hidden'

  // Focus trap for accessibility
  modal.focus()
}

function createImageModal(imageUrl, productName) {
  const modal = createElementFromHTML(`
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm"
         id="image-modal"
         onclick="closeImageModal()"
         tabindex="0">
      <div class="relative max-w-7xl max-h-full p-4" onclick="event.stopPropagation()">
        <!-- Close Button -->
        <button class="absolute top-2 right-2 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-all duration-300"
                onclick="closeImageModal()"
                title="Close (ESC)">
          <i class="fa-solid fa-times text-xl"></i>
        </button>

        <!-- Image Container -->
        <div class="relative">
          <img src="${imageUrl}"
               alt="${productName}"
               class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
               id="modal-image">

          <!-- Loading Spinner -->
          <div id="modal-loading" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>

        <!-- Image Info -->
        <div class="text-center mt-4 text-white">
          <h3 class="text-lg font-semibold">${productName}</h3>
          <p class="text-sm text-gray-300 mt-1">Click outside or press ESC to close</p>
        </div>

        <!-- Navigation Arrows (if multiple images) -->
        ${galleryImages.length > 1 ? `
          <button class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-all duration-300"
                  onclick="navigateModalImage(-1)">
            <i class="fa-solid fa-chevron-left text-xl"></i>
          </button>
          <button class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-3 transition-all duration-300"
                  onclick="navigateModalImage(1)">
            <i class="fa-solid fa-chevron-right text-xl"></i>
          </button>
        ` : ''}
      </div>
    </div>
  `)

  // Handle image load
  const modalImage = modal.querySelector('#modal-image')
  const modalLoading = modal.querySelector('#modal-loading')

  modalImage.onload = function() {
    modalLoading.style.display = 'none'
  }

  modalImage.onerror = function() {
    modalLoading.innerHTML = `
      <div class="text-white text-center">
        <i class="fa-solid fa-exclamation-triangle text-4xl mb-2"></i>
        <p>Failed to load image</p>
      </div>
    `
  }

  // Add keyboard navigation
  modal.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeImageModal()
    } else if (e.key === 'ArrowLeft' && galleryImages.length > 1) {
      navigateModalImage(-1)
    } else if (e.key === 'ArrowRight' && galleryImages.length > 1) {
      navigateModalImage(1)
    }
  })

  return modal
}

window.closeImageModal = function() {
  const modal = document.getElementById('image-modal')
  if (modal) {
    modal.remove()
    document.body.style.overflow = ''
  }
}

window.navigateModalImage = function(direction) {
  if (galleryImages.length <= 1) return

  currentImageIndex += direction

  if (currentImageIndex >= galleryImages.length) {
    currentImageIndex = 0
  } else if (currentImageIndex < 0) {
    currentImageIndex = galleryImages.length - 1
  }

  const modalImage = document.getElementById('modal-image')
  const modalLoading = document.getElementById('modal-loading')

  if (modalImage && modalLoading) {
    modalLoading.style.display = 'flex'
    modalImage.src = galleryImages[currentImageIndex]

    // Update main gallery as well
    changeMainImageWithAnimation(galleryImages[currentImageIndex], currentImageIndex)
  }
}

// Cleanup function
function cleanupImageGallery() {
  document.removeEventListener('keydown', handleKeyboardNavigation)
  currentImageIndex = 0
  galleryImages = []

  // Close any open modals
  const modal = document.getElementById('image-modal')
  if (modal) {
    modal.remove()
    document.body.style.overflow = ''
  }
}

// Helper functions
function getOrCreateSessionId() {
  let sessionId = localStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

async function getProductIdFromSlug(slug) {
  try {
    // Try to get from current product data first
    const currentProduct = window.currentProduct
    if (currentProduct && (currentProduct.slug === slug || currentProduct.id === slug)) {
      return currentProduct.id
    }

    // Fallback: fetch product by slug
    const { productService } = await import('../services/api.js')
    const product = await productService.getProductById(slug)
    return product.id
  } catch (error) {
    console.error('Failed to get product ID:', error)
    // If slug is actually an ID, return it
    if (!isNaN(slug)) {
      return parseInt(slug)
    }
    throw error
  }
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

function updateWishlistCounter() {
  // Update wishlist badge
  const wishlistBadges = document.querySelectorAll('.wishlist-badge')
  wishlistBadges.forEach(badge => {
    const currentCount = parseInt(badge.textContent) || 0
    badge.textContent = currentCount + 1
    badge.style.display = 'block'
  })
}

// Utility functions for product detail interactions
window.changeQuantity = function(delta) {
  const quantityElement = document.querySelector('#quantity')
  if (quantityElement) {
    let currentQuantity = parseInt(quantityElement.textContent)
    const maxStock = parseInt(quantityElement.dataset.maxStock) || 999
    currentQuantity = Math.max(1, Math.min(maxStock, currentQuantity + delta))
    quantityElement.textContent = currentQuantity
  }
}

window.addToCart = async function(productSlug) {
  try {
    const quantityElement = document.querySelector('#quantity')
    const quantity = quantityElement ? parseInt(quantityElement.textContent) : 1

    // Get product ID from slug
    const productId = await getProductIdFromSlug(productSlug)

    if (window.cart) {
      await window.cart.addToCart(productId, quantity)
    } else {
      // Fallback to direct API call
      const { cartService } = await import('../services/api.js')
      const sessionId = getOrCreateSessionId()

      const response = await cartService.addToCart(productId, quantity, sessionId)

      if (response.success || response.message) {
        showToast(`Added ${quantity} item(s) to cart!`, 'success')
        updateCartCounter()
      } else {
        throw new Error(response.error || 'Failed to add to cart')
      }
    }
  } catch (error) {
    console.error('Failed to add to cart:', error)
    const errorMessage = error.message || 'Failed to add to cart'
    showToast(errorMessage, 'error')
  }
}

window.addToWishlist = async function(productSlug) {
  try {
    // Check if user is authenticated
    const { isAuthenticated } = store.getState()
    if (!isAuthenticated) {
      showToast('Please login to add items to wishlist', 'warning')
      location.hash = '/login'
      return
    }

    // Get product ID from slug
    const productId = await getProductIdFromSlug(productSlug)

    const { cartService } = await import('../services/api.js')
    const response = await cartService.saveItem(productId)

    if (response.success || response.message) {
      showToast('Added to wishlist!', 'success')
      updateWishlistCounter()
    } else {
      throw new Error(response.error || 'Failed to add to wishlist')
    }
  } catch (error) {
    console.error('Failed to add to wishlist:', error)
    const errorMessage = error.message || 'Failed to add to wishlist'
    showToast(errorMessage, 'error')
  }
}

window.shareProduct = function() {
  if (navigator.share) {
    navigator.share({
      title: document.title,
      url: window.location.href
    })
  } else {
    navigator.clipboard.writeText(window.location.href)
    showToast('Product link copied to clipboard!', 'success')
  }
}

window.changeMainImage = function(newSrc, thumbnail) {
  const mainImage = document.querySelector('#main-image')
  if (mainImage) {
    mainImage.src = newSrc

    // Update thumbnail borders
    document.querySelectorAll('.thumbnail-image').forEach(img => {
      img.classList.remove('border-secondary')
      img.classList.add('border-gray-200')
    })

    if (thumbnail) {
      thumbnail.classList.remove('border-gray-200')
      thumbnail.classList.add('border-secondary')
    }
  }
}
