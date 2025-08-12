import { createElementFromHTML, showToast } from "../utils/helpers.js"
import { productService } from "../services/api.js"
import { ProductCard } from "../components/ProductCard.js"

export default function ProductListPage() {
  const page = createElementFromHTML(`
        <div class="min-h-screen bg-gray-50">

            <div class="bg-white border-b">
                <div class="container mx-auto py-8 px-4">
                    <div class="text-center">
                        <h1 class="text-4xl font-bold text-primary mb-4">All Products</h1>
                        <p class="text-lg text-muted max-w-2xl mx-auto">Discover amazing products with smart search and AI-powered recommendations</p>
                    </div>
                </div>
            </div>

            <div class="container mx-auto py-8 px-4">
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <aside class="lg:col-span-1">
                        <div class="lg:hidden mb-6">
                            <button class="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow-md hover:border-secondary/30 transition-all duration-200" onclick="toggleMobileFilters()">
                                <span class="flex items-center font-semibold text-primary">
                                    <div class="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center mr-3">
                                        <i class="fa-solid fa-sliders-h text-secondary text-sm"></i>
                                    </div>
                                    Filters & Sort
                                </span>
                                <i class="fa-solid fa-chevron-down text-gray-400 transition-transform duration-200" id="filter-chevron"></i>
                            </button>
                        </div>

                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hidden lg:block" id="filters-panel">
                            <div class="border-b border-gray-100 p-6">
                                <h3 class="font-bold text-xl text-primary flex items-center">
                                    <div class="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center mr-3">
                                        <i class="fa-solid fa-sliders-h text-secondary"></i>
                                    </div>
                                    Filters
                                </h3>
                                <p class="text-gray-600 text-sm mt-1">Refine your search results</p>
                            </div>

                            <div class="p-6 space-y-8">
                                <div>
                                    <div class="flex items-center justify-between mb-4">
                                        <h4 class="font-semibold text-primary flex items-center">
                                            <i class="fa-solid fa-tags text-secondary mr-2"></i>
                                            Categories
                                        </h4>
                                        <span class="text-xs text-gray-500 bg-light-gray px-2 py-1 rounded font-medium">Filter</span>
                                    </div>
                                    <div id="category-filters" class="space-y-1">
                                        </div>
                                </div>

                                <div>
                                    <div class="flex items-center justify-between mb-4">
                                        <h4 class="font-semibold text-primary flex items-center">
                                            <i class="fa-solid fa-store text-secondary mr-2"></i>
                                            Stores
                                        </h4>
                                        <span class="text-xs text-gray-500 bg-light-gray px-2 py-1 rounded font-medium">Filter</span>
                                    </div>
                                    <div id="store-filters" class="space-y-1">
                                        </div>
                                </div>

                                <div>
                                    <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                                        <i class="fa-solid fa-dollar-sign text-secondary mr-2"></i>
                                        Price Range
                                    </h4>
                                    <div class="space-y-4">
                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-600 mb-2">Min Price</label>
                                                <div class="relative">
                                                    <input type="number" placeholder="$0" class="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-white text-gray-700" id="price-min">
                                                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-600 mb-2">Max Price</label>
                                                <div class="relative">
                                                    <input type="number" placeholder="$999" class="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-white text-gray-700" id="price-max">
                                                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <i class="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button class="w-full bg-secondary hover:bg-secondary/90 text-white font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center" id="apply-price-filter">
                                            <i class="fa-solid fa-check mr-2"></i>
                                            Apply Price Filter
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <h4 class="font-semibold text-gray-800 mb-4 flex items-center">
                                        <i class="fa-solid fa-sort text-secondary mr-2"></i>
                                        Sort By
                                    </h4>
                                    <div class="relative">
                                        <select class="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-white text-gray-700 appearance-none pr-10" id="sort-select">
                                            <option value="name">Name (A-Z)</option>
                                            <option value="price-low">Price: Low to High</option>
                                            <option value="price-high">Price: High to Low</option>
                                            <option value="rating">Highest Rated</option>
                                            <option value="newest">Newest First</option>
                                        </select>
                                        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                            <i class="fa-solid fa-chevron-down text-gray-400"></i>
                                        </div>
                                    </div>
                                </div>

                                <div class="pt-6">
                                    <button class="w-full border border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400 font-medium py-2.5 px-4 rounded-md transition-colors duration-200 flex items-center justify-center bg-white" id="clear-filters">
                                        <i class="fa-solid fa-refresh mr-2"></i>
                                        Clear All Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <main class="lg:col-span-3">
                        <div class="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
                            <div class="flex flex-col lg:flex-row gap-4">
                                <div class="flex-1">
                                    <div class="relative">
                                        <input type="search" placeholder="Search for products..." class="input-field w-full pl-12 pr-4 py-3 text-lg border-2 focus:border-secondary focus:ring-4 focus:ring-secondary/20" id="search-input">
                                        <i class="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg"></i>
                                    </div>
                                </div>
                                <button class="btn btn-primary lg:w-auto px-6 py-3 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200" id="ai-search-btn">
                                    <i class="fa-solid fa-magic mr-2"></i>
                                    AI Smart Search
                                </button>
                            </div>
                        </div>

                        <div class="bg-white rounded-xl shadow-lg border border-gray-100 p-5 mb-6">
                            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div id="results-info" class="text-gray-700 font-semibold flex items-center">
                                    <i class="fa-solid fa-spinner fa-spin mr-3 text-secondary"></i>
                                    Loading products...
                                </div>
                                <div class="flex items-center gap-4">
                                    <span class="text-sm text-gray-600 font-medium hidden sm:block">View:</span>
                                    <div class="flex gap-1 bg-gray-100 rounded-xl p-1.5 shadow-inner">
                                        <button class="btn-view-toggle active" id="grid-view" title="Grid View">
                                            <i class="fa-solid fa-th"></i>
                                        </button>
                                        <button class="btn-view-toggle" id="list-view" title="List View">
                                            <i class="fa-solid fa-list"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="products-grid" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                            <div class="col-span-full flex justify-center py-12">
                                <div class="text-center">
                                    <div class="loader w-12 h-12 border-4 border-gray-200 border-t-secondary rounded-full animate-spin mx-auto mb-4"></div>
                                    <p class="text-gray-500">Loading amazing products...</p>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-center">
                            <div class="flex gap-2" id="pagination">
                                </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    `)

  import('../state/store.js').then(({ default: store }) => {
    store.addObserver(() => {
      renderPersonalizedSection()
    })
  })

  // Initialize page functionality
  initializeProductList(page)

  // Add mobile filter toggle functionality
  window.toggleMobileFilters = function() {
    const filtersPanel = page.querySelector('#filters-panel')
    const chevron = page.querySelector('#filter-chevron')

    if (filtersPanel.classList.contains('hidden')) {
      filtersPanel.classList.remove('hidden')
      filtersPanel.classList.add('block')
      chevron.classList.remove('fa-chevron-down')
      chevron.classList.add('fa-chevron-up')
    } else {
      filtersPanel.classList.add('hidden')
      filtersPanel.classList.remove('block')
      chevron.classList.remove('fa-chevron-up')
      chevron.classList.add('fa-chevron-down')
    }
  }

  return page
}

function initializeProductList(page) {
  let currentProducts = []
  let searchTimeout = null
  let priceInputTimeout = null // For debouncing price inputs
  let currentFilters = {
    category: null,
    store: null, // Changed from vendor to store
    priceMin: null,
    priceMax: null,
    search: '',
    sort: 'name'
  }

  // Define common misspellings/aliases for search terms
  const searchAliases = {
    "dill": "dell",
    // Add more as needed: e.g., "aple": "apple", "samung": "samsung"
  };


  // Parse URL parameters on page load
  function parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')

    if (urlParams.get('search')) {
      currentFilters.search = urlParams.get('search')
      const searchInput = page.querySelector('#search-input')
      if (searchInput) searchInput.value = currentFilters.search // Display original search term in input
    }

    if (urlParams.get('category')) {
      currentFilters.category = urlParams.get('category')
    }

    if (urlParams.get('store')) { // Parse store from URL
      currentFilters.store = urlParams.get('store')
    }

    if (urlParams.get('sort')) {
      currentFilters.sort = urlParams.get('sort')
      const sortSelect = page.querySelector('#sort-select')
      if (sortSelect) sortSelect.value = currentFilters.sort
    }

    if (urlParams.get('price__gte')) {
        currentFilters.priceMin = parseFloat(urlParams.get('price__gte'))
        const priceMinInput = page.querySelector('#price-min')
        if (priceMinInput) priceMinInput.value = currentFilters.priceMin
    }
    if (urlParams.get('price__lte')) {
        currentFilters.priceMax = parseFloat(urlParams.get('price__lte'))
        const priceMaxInput = page.querySelector('#price-max')
        if (priceMaxInput) priceMaxInput.value = currentFilters.priceMax
    }
  }

  // Update URL to reflect current filters
  function updateUrl() {
    const urlParams = new URLSearchParams()
    if (currentFilters.category) {
      urlParams.append('category', currentFilters.category)
    }
    if (currentFilters.store) { // Add store to URL
      urlParams.append('store', currentFilters.store)
    }
    if (currentFilters.priceMin) {
      urlParams.append('price__gte', currentFilters.priceMin)
    }
    if (currentFilters.priceMax) {
      urlParams.append('price__lte', currentFilters.priceMax)
    }
    if (currentFilters.search) {
      urlParams.append('search', currentFilters.search)
    }
    if (currentFilters.sort && currentFilters.sort !== 'name') { // Only add sort if not default
      urlParams.append('sort', currentFilters.sort)
    }

    const newHash = urlParams.toString() ? `?${urlParams.toString()}` : ''
    // Using replaceState for cleaner URL without adding to browser history
    history.replaceState(null, '', `#${newHash}`)
  }


  // Load products
  async function loadProducts() {
    try {
      // Build query parameters
      const params = new URLSearchParams()

      // Apply search alias before sending to API
      let searchTermForAPI = currentFilters.search.toLowerCase();
      if (searchAliases[searchTermForAPI]) {
        searchTermForAPI = searchAliases[searchTermForAPI];
      }

      // Add filters to API call
      if (currentFilters.category) {
        params.append('category__name', currentFilters.category)
      }
      if (currentFilters.store) { // Add store filter to API call
        params.append('store__name', currentFilters.store) // Assuming API filters by store name
      }
      if (currentFilters.priceMin) {
        params.append('price__gte', currentFilters.priceMin)
      }
      if (currentFilters.priceMax) {
        params.append('price__lte', currentFilters.priceMax)
      }
      if (searchTermForAPI) { // Use aliased search term
        params.append('search', searchTermForAPI) // API should handle partial search
      }
      if (currentFilters.sort) {
        let ordering = ''
        switch (currentFilters.sort) {
          case 'price-low':
            ordering = 'price'
            break
          case 'price-high':
            ordering = '-price'
            break
          case 'rating':
            ordering = '-average_rating'
            break
          case 'newest':
            ordering = '-created_at'
            break
          default:
            ordering = 'name'
        }
        params.append('ordering', ordering)
      }

      const data = await productService.getProducts(params.toString())
      let products = data.results || data

      // فلترة المنتجات حسب المتجر إذا كان الفلتر مفعل
      if (currentFilters.store) {
        products = products.filter(product => {
          // تحقق من وجود خاصية store واسم المتجر
          if (product.store && product.store.name) {
            return product.store.name === currentFilters.store
          }
          return false
        })
      }
      // فلترة المنتجات حسب التصنيف إذا كان الفلتر مفعل
      if (currentFilters.category) {
        products = products.filter(product => {
          // تحقق من وجود خاصية category واسم التصنيف
          if (product.category && product.category.name) {
            return product.category.name === currentFilters.category
          }
          return false
        })
      }
      // فلترة المنتجات حسب نطاق السعر إذا كان الفلتر مفعل
      if (currentFilters.priceMin !== null) {
        products = products.filter(product => {
          let price = product.price;
          if (typeof price === 'string') price = parseFloat(price);
          if (typeof price !== 'number' || isNaN(price)) return false;
          return price >= currentFilters.priceMin;
        })
      }
      if (currentFilters.priceMax !== null) {
        products = products.filter(product => {
          let price = product.price;
          if (typeof price === 'string') price = parseFloat(price);
          if (typeof price !== 'number' || isNaN(price)) return false;
          return price <= currentFilters.priceMax;
        })
      }
      currentProducts = products

      // Load categories and stores after products are loaded to get counts
      await loadCategoriesFromAPI(page)
      await loadStoresFromAPI(page)

      renderProducts()
      updateResultsInfo()
    } catch (error) {
      console.error('Failed to load products:', error)
      page.querySelector('#products-grid').innerHTML =
        '<p class="text-danger col-span-full text-center">Could not load products. Please try again later.</p>'
    }
  }

  // Render products
  function renderProducts() {
    const grid = page.querySelector('#products-grid')
    if (currentProducts.length === 0) {
      grid.innerHTML = '<p class="text-muted col-span-full text-center">No products found.</p>'
      return
    }

    grid.innerHTML = currentProducts.map(ProductCard).join('')
  }

  // Update results info
  function updateResultsInfo() {
    const info = page.querySelector('#results-info')
    if (info) {
      info.innerHTML = `Showing <span class="text-secondary">${currentProducts.length}</span> products`
      if (currentFilters.search) {
          info.innerHTML += ` for "<span class="text-secondary">${currentFilters.search}</span>"`
      }
    }
  }

  // Apply filters - now triggers a new API call
  async function applyFilters() {
    try {
      // Show loading state
      const grid = page.querySelector('#products-grid')
      grid.innerHTML = `
        <div class="col-span-full flex justify-center py-12">
          <div class="text-center">
            <div class="loader w-12 h-12 border-4 border-gray-200 border-t-secondary rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-500">Filtering products...</p>
          </div>
        </div>
      `

      // Reload products with current filters
      await loadProducts()

      // Update URL to reflect current filters
      updateUrl()

    } catch (error) {
      console.error('Failed to apply filters:', error)
      showToast('Failed to apply filters', 'error')
    }
  }

  // Load categories from API and calculate counts
  async function loadCategoriesFromAPI(page) {
    try {
      // تأكد من تعريف المتغير page
      const container = (typeof page !== 'undefined') ? page.querySelector('#category-filters') : document.querySelector('#category-filters');
      const categoriesData = await productService.getCategories()

      const categoryMap = new Map()
      currentProducts.forEach(product => {
        if (product.category && product.category.name) {
          const count = categoryMap.get(product.category.name) || 0
          categoryMap.set(product.category.name, count + 1)
        }
      })

      let categoriesArr = []
      if (Array.isArray(categoriesData)) {
        categoriesArr = categoriesData
      } else if (categoriesData && Array.isArray(categoriesData.results)) {
        categoriesArr = categoriesData.results
      }

      const categories = categoriesArr.map(category => ({
        name: category.name,
        count: categoryMap.get(category.name) || 0
      })).filter(category => category.count > 0) // Only show categories with products

      const totalProducts = currentProducts.length
      renderCategories(categories, totalProducts)

      // Set initial radio button state based on currentFilters.category
      if (currentFilters.category) {
        const selectedRadio = container.querySelector(`input[name="category"][value="${currentFilters.category}"]`)
        if (selectedRadio) {
            selectedRadio.checked = true
            updateFilterRadioStyle(selectedRadio.parentElement, true)
        }
      } else {
        const allCategoriesRadio = container.querySelector(`input[name="category"][value=""]`)
        if (allCategoriesRadio) {
            allCategoriesRadio.checked = true
            updateFilterRadioStyle(allCategoriesRadio.parentElement, true)
        }
      }


    } catch (error) {
      console.error('Failed to load categories:', error)
      // Fallback: If API fails, categories won't be displayed, which is acceptable.
    }
  }

  // Load stores from API and calculate counts (Changed from loadVendorsFromAPI)
  async function loadStoresFromAPI(page) {
    try {
      const storesData = await productService.getStores() // Assuming a new service method: getStores
      const container = page.querySelector('#store-filters') // Changed ID

      const storeMap = new Map()
      currentProducts.forEach(product => {
        if (product.store && product.store.name) { // Assuming product has a store object
          const count = storeMap.get(product.store.name) || 0
          storeMap.set(product.store.name, count + 1)
        }
      })

      let storesArr = []
      if (Array.isArray(storesData)) {
        storesArr = storesData
      } else if (storesData && Array.isArray(storesData.results)) {
        storesArr = storesData.results
      }

      // جلب جميع المتاجر النشطة وغير النشطة
      // إذا كان المتجر يحتوي على خاصية is_active أو active، أضفها للفلاتر
      const stores = storesArr.map(store => ({
        name: store.name,
        count: storeMap.get(store.name) !== undefined ? storeMap.get(store.name) : 0,
        isActive: store.is_active !== undefined ? store.is_active : (store.active !== undefined ? store.active : true)
      }))
      // عرض جميع المتاجر حتى لو لم يكن لديها منتجات (count=0)
      // يمكن تمييز المتاجر غير النشطة في الفلتر

      const totalProducts = currentProducts.length
      renderStoresWithActive(stores, totalProducts)

      // Set initial radio button state based on currentFilters.store
      if (currentFilters.store) {
        const selectedRadio = container.querySelector(`input[name="store"][value="${currentFilters.store}"]`)
        if (selectedRadio) {
            selectedRadio.checked = true
            updateFilterRadioStyle(selectedRadio.parentElement, true)
        }
      } else {
        const allStoresRadio = container.querySelector(`input[name="store"][value=""]`)
        if (allStoresRadio) {
            allStoresRadio.checked = true
            updateFilterRadioStyle(allStoresRadio.parentElement, true)
        }
      }

    } catch (error) {
      console.error('Failed to load stores:', error)
      // Fallback: If API fails, stores won't be displayed.
    }
  }


  // Render categories in the UI
  function renderCategories(categories, totalProducts) {
    const container = page.querySelector('#category-filters')
    if (!container) return;

    // قائمة منسدلة لاختيار التصنيف
    const selectHtml = `
      <label class="block text-sm font-medium text-primary mb-2">اختر التصنيف</label>
      <select id="category-select" class="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-white text-gray-700">
        <option value="">جميع التصنيفات (${totalProducts})</option>
        ${categories.map(category => `
          <option value="${category.name}" ${currentFilters.category === category.name ? 'selected' : ''}>
            ${category.name} (${category.count})
          </option>
        `).join('')}
      </select>
    `
    container.innerHTML = selectHtml
  }

  // Render stores in the UI (Changed from renderVendors)
  // دالة جديدة لعرض جميع المتاجر مع تمييز النشطة وغير النشطة
  function renderStoresWithActive(stores, totalProducts) {
    const container = page.querySelector('#store-filters')
    if (!container) return;

    // قائمة منسدلة لاختيار المتجر
    const selectHtml = `
      <label class="block text-sm font-medium text-primary mb-2">اختر المتجر</label>
      <select id="store-select" class="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary bg-white text-gray-700">
        <option value="">جميع المتاجر (${totalProducts})</option>
        ${stores.map(store => `
          <option value="${store.name}" ${currentFilters.store === store.name ? 'selected' : ''} ${!store.isActive ? 'style=\"color:#b91c1c\"' : ''}>
            ${store.name}${!store.isActive ? ' (غير نشط)' : ''} (${store.count})
          </option>
        `).join('')}
      </select>
    `
    container.innerHTML = selectHtml
  }

  // Helper function to update radio button visual style
  function updateFilterRadioStyle(labelElement, isChecked) {
      const radioButton = labelElement.querySelector('div')
      const textSpan = labelElement.querySelector('span.font-medium')
      const countSpan = labelElement.querySelector('span.text-sm')

      if (isChecked) {
          labelElement.classList.add('border', 'border-secondary', 'bg-secondary/5')
          labelElement.classList.remove('border-gray-200') // Ensure this isn't conflicting
          radioButton.classList.add('border-secondary', 'bg-secondary')
          radioButton.classList.remove('border-gray-300')
          radioButton.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>'
          if (textSpan) textSpan.classList.add('text-primary')
          if (countSpan) {
              countSpan.classList.add('bg-white')
              countSpan.classList.remove('bg-light-gray')
          }
      } else {
          labelElement.classList.remove('border', 'border-secondary', 'bg-secondary/5')
          labelElement.classList.add('border-gray-200') // Add back default border
          radioButton.classList.remove('border-secondary', 'bg-secondary')
          radioButton.classList.add('border-gray-300')
          radioButton.innerHTML = ''
          if (textSpan) textSpan.classList.remove('text-primary')
          if (countSpan) {
              countSpan.classList.remove('bg-white')
              countSpan.classList.add('bg-light-gray')
          }
      }
  }


  // Event listeners
  page.addEventListener('change', async (e) => {
    // Category filter (قائمة منسدلة)
    if (e.target.id === 'category-select') {
      currentFilters.category = e.target.value || null
      await applyFilters()
    }

    // Store filter (قائمة منسدلة)
    if (e.target.id === 'store-select') {
      currentFilters.store = e.target.value || null
      await applyFilters()
    }

    // Sort select
    if (e.target.id === 'sort-select') {
      currentFilters.sort = e.target.value
      await applyFilters()
    }
  })

  page.addEventListener('click', async (e) => {
    if (e.target.id === 'apply-price-filter') {
      const minInput = page.querySelector('#price-min')
      const maxInput = page.querySelector('#price-max')
      currentFilters.priceMin = minInput.value ? parseFloat(minInput.value) : null
      currentFilters.priceMax = maxInput.value ? parseFloat(maxInput.value) : null
      await applyFilters()
    }

    if (e.target.id === 'clear-filters') {
      currentFilters = { category: null, store: null, priceMin: null, priceMax: null, search: '', sort: 'name' }
      page.querySelector('#search-input').value = ''
      page.querySelector('#price-min').value = ''
      page.querySelector('#price-max').value = ''
      page.querySelector('#sort-select').value = 'name'

      // Reset category and store radios
      const allCategoryRadio = page.querySelector('input[name="category"][value=""]')
      if (allCategoryRadio) allCategoryRadio.checked = true
      const allStoreRadio = page.querySelector('input[name="store"][value=""]')
      if (allStoreRadio) allStoreRadio.checked = true

      // Update styles for all filters
      page.querySelectorAll('.category-filter').forEach(label => {
          const radio = label.querySelector('.category-radio')
          updateFilterRadioStyle(label, radio.checked)
      })
      page.querySelectorAll('.store-filter').forEach(label => { // Changed from vendor-filter
          const radio = label.querySelector('.store-radio')
          updateFilterRadioStyle(label, radio.checked)
      })

      applyFilters()
    }

    if (e.target.id === 'ai-search-btn') {
      showToast("AI search feature coming soon!", "info")
    }
  })

  page.addEventListener('input', (e) => {
    if (e.target.id === 'search-input') {
      currentFilters.search = e.target.value
      // Debounce search
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(async () => {
        await applyFilters()
      }, 300)
    }

    // Debounce price inputs
    if (e.target.id === 'price-min' || e.target.id === 'price-max') {
        clearTimeout(priceInputTimeout);
        priceInputTimeout = setTimeout(async () => {
            const minInput = page.querySelector('#price-min');
            const maxInput = page.querySelector('#price-max');
            currentFilters.priceMin = minInput.value ? parseFloat(minInput.value) : null;
            currentFilters.priceMax = maxInput.value ? parseFloat(maxInput.value) : null;
            await applyFilters();
        }, 500); // Adjust debounce time as needed
    }
  })

  // Add mobile filter toggle functionality
  window.toggleMobileFilters = function() {
    const filtersPanel = page.querySelector('#filters-panel')
    const chevron = page.querySelector('#filter-chevron')

    if (filtersPanel.classList.contains('hidden')) {
      filtersPanel.classList.remove('hidden')
      filtersPanel.style.animation = 'slideDown 0.3s ease-out'
      chevron.style.transform = 'rotate(180deg)'
      // Add backdrop for mobile
      if (window.innerWidth < 1024) {
        document.body.style.overflow = 'hidden'
      }
    } else {
      filtersPanel.style.animation = 'slideUp 0.3s ease-in'
      setTimeout(() => {
        filtersPanel.classList.add('hidden')
      }, 250)
      chevron.style.transform = 'rotate(0deg)'
      document.body.style.overflow = 'auto'
    }
  }

  // Hide filters on mobile by default
  if (window.innerWidth < 1024) {
    page.querySelector('#filters-panel').classList.add('hidden')
  }
  // Add CSS for filter sections to enable scrolling
  const style = document.createElement('style')
  style.textContent = `
    #category-filters, #store-filters {
      max-height: 200px; /* Adjust as needed */
      overflow-y: auto;
      padding-right: 10px; /* Space for scrollbar */
    }

    /* Custom scrollbar for Webkit browsers */
    #category-filters::-webkit-scrollbar,
    #store-filters::-webkit-scrollbar {
      width: 8px;
    }

    #category-filters::-webkit-scrollbar-track,
    #store-filters::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }

    #category-filters::-webkit-scrollbar-thumb,
    #store-filters::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 1
0px;
    }

    #category-filters::-webkit-scrollbar-thumb:hover,
    #store-filters::-webkit-scrollbar-thumb:hover {
      background: #555;
    }

    /* Animations for mobile filter panel */
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideUp {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
  `
  document.head.appendChild(style)

  // Initialize
  parseUrlParams()
  loadProducts() // Initial load of products with parsed URL params
}/**
 * Renders the personalized recommendations section.
 * This function is called when the store state changes.
 */
// ...existing code...
