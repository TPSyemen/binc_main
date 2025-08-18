import { createElementFromHTML } from "../utils/helpers.js?v=2024"
import { productService, recommendationService } from "../services/api.js" // Import recommendationService
import { ProductCard } from "../components/ProductCard.js"
import store from "../state/store.js" // Import store for authentication check
import { behaviorTracker } from "../services/behaviorTracker.js"

/**
 * Renders the Home Page, inspired by the provided image.
 * @returns {HTMLElement} The page element.
 */
export default function HomePage() {
  // Check user authentication status
  const { isAuthenticated, user } = store.getState()
  const isStoreOwner = user && user.role === 'store_owner'
  
  // Variables for Load More functionality
  let allRecommendations = [];
  let allNewArrivals = [];
  let allTrendingProducts = [];
  let displayedRecommendationsCount = 0;
  let displayedArrivalsCount = 0;
  let displayedTrendingCount = 0;
  const INITIAL_LOAD = 20;
  const LOAD_MORE_INCREMENT = 10;
  
  // Flags to prevent duplicate API calls
  let isLoadingRecommendations = false;
  let isLoadingTrending = false;

  const page = createElementFromHTML(`
        <div class="animate-fade-in">
            <section class="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
                <div class="container mx-auto px-4 text-center">
                    <h1 class="text-5xl font-extrabold text-primary mb-4">Limited Time Discount 40%</h1>
                    <p class="text-3xl text-muted font-medium mb-8">$385.00</p>
                    <div>
                        ${isStoreOwner ? `
                            <a href="#/products-management" class="btn btn-primary mr-4">Manage Products</a>
                            <a href="#/store-dashboard" class="btn btn-outline">Store Dashboard</a>
                        ` : `
                            <a href="#/products" class="btn btn-primary mr-4">Buy Now</a>
                            <a href="#/compare" class="btn btn-outline">Compare Smartly</a>
                        `}
                    </div>
                </div>
            </section>

            <section class="categories-section py-16">
                <div class="container mx-auto px-4">
                    <div class="text-center mb-12">
                        <h2 class="section-title text-3xl md:text-4xl font-bold mb-4">
                            Browse By Category
                            <span class="block text-lg font-normal text-gray-600 mt-2">Discover our wide range of premium products</span>
                        </h2>
                        <div class="section-divider"></div>

                        <div class="mt-8 max-w-md mx-auto">
                            <div class="relative">
                                <input
                                    type="text"
                                    id="category-search"
                                    placeholder="Search categories..."
                                    class="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all duration-300"
                                    style="display: none;"
                                >
                                <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <i class="fa-solid fa-search"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="category-grid" class="category-grid">
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                        <div class="category-skeleton"></div>
                    </div>

                    <div id="category-stats" class="mt-12 text-center" style="display: none;">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
                            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                <div class="text-2xl font-bold text-secondary" id="total-categories">0</div>
                                <div class="text-sm text-gray-600">Categories</div>
                            </div>
                            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                <div class="text-2xl font-bold text-primary" id="total-products">0</div>
                                <div class="text-sm text-gray-600">Products</div>
                            </div>
                            <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                                <div class="text-2xl font-bold text-green-600" id="avg-products">0</div>
                                <div class="text-sm text-gray-600">Avg per Category</div>
                            </div>
                        </div>
                    </div>

                    <div class="text-center mt-8">
                        ${isStoreOwner ? `
                            <button onclick="location.hash='/products-management'" class="btn btn-outline group">
                                <span>Manage Your Products</span>
                                <i class="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform duration-300"></i>
                            </button>
                        ` : `
                            <button onclick="location.hash='/products'" class="btn btn-outline group">
                                <span>View All Products</span>
                                <i class="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform duration-300"></i>
                            </button>
                        `}
                    </div>
                </div>
            </section>

            ${!isStoreOwner ? `
                <section class="bg-light-gray py-16">
                    <div class="container mx-auto px-4">
                        <div class="flex justify-between items-center mb-8">
                            <h2 class="text-2xl font-bold">New Arrivals</h2>
                            <a href="#/products" class="text-secondary font-bold">View All &rarr;</a>
                        </div>
                        <div id="new-arrivals-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                            <div class="loader"></div>
                        </div>
                        <div class="text-center mt-6">
                            <button id="load-more-arrivals" class="btn btn-outline hidden hover:bg-secondary hover:text-white transition-all duration-300" onclick="loadMoreArrivals()">
                                <i class="fa-solid fa-plus mr-2"></i>
                                Load More Products
                                <span id="arrivals-count" class="ml-2 text-xs bg-secondary text-white px-2 py-1 rounded-full"></span>
                            </button>
                            <div id="arrivals-complete" class="hidden text-center text-gray-600 mt-4">
                                <i class="fa-solid fa-check-circle text-green-500 mr-2"></i>
                                All products loaded!
                            </div>
                        </div>
                    </div>
                </section> 

                <div id="personalized-recommendations-section"></div>
                
                <div id="trending-products-section"></div>
            ` : `
                <section class="bg-light-gray py-16">
                    <div class="container mx-auto px-4 text-center">
                        <h2 class="text-3xl font-bold text-primary mb-6">Welcome to Your Store Dashboard</h2>
                        <p class="text-lg text-muted mb-8">Manage your products, view analytics, and grow your business</p>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            <div class="bg-white rounded-lg p-6 shadow-sm border">
                                <i class="fa-solid fa-box text-3xl text-secondary mb-4"></i>
                                <h3 class="text-xl font-semibold mb-2">Manage Products</h3>
                                <p class="text-gray-600 mb-4">Add, edit, and organize your product catalog</p>
                                <a href="#/products-management" class="btn btn-primary">Go to Products</a>
                            </div>
                            <div class="bg-white rounded-lg p-6 shadow-sm border">
                                <i class="fa-solid fa-chart-line text-3xl text-secondary mb-4"></i>
                                <h3 class="text-xl font-semibold mb-2">View Analytics</h3>
                                <p class="text-gray-600 mb-4">Track your store performance and sales</p>
                                <a href="#/store-dashboard" class="btn btn-primary">View Dashboard</a>
                            </div>
                            <div class="bg-white rounded-lg p-6 shadow-sm border">
                                <i class="fa-solid fa-plus text-3xl text-secondary mb-4"></i>
                                <h3 class="text-xl font-semibold mb-2">Add New Product</h3>
                                <p class="text-gray-600 mb-4">Expand your catalog with new products</p>
                                <a href="#/products/add" class="btn btn-primary">Add Product</a>
                            </div>
                        </div>
                    </div>
                </section>
            `}

            </div>
    `);

  // Handle Personalized Recommendations Section (only for non-store owners)
  const personalizedRecsContainer = page.querySelector("#personalized-recommendations-section");

  // Only show recommendations section for non-store owners
  if (personalizedRecsContainer && !isStoreOwner) {
    const recSectionHtml = `
            <section class="py-16">
                <div class="container mx-auto px-4">
                    <div class="flex justify-between items-center mb-8">
                        <h2 class="text-2xl font-bold">Personalized Recommendations</h2>
                        <div class="flex items-center gap-4">
                            <button id="refresh-recommendations" class="btn btn-outline text-sm" onclick="refreshRecommendations()">
                                <i class="fa-solid fa-refresh mr-2"></i>
                                Refresh Recommendations
                            </button>
                            <a href="#/products" class="text-secondary font-bold">View All &rarr;</a>
                        </div>
                    </div>
                    <div id="personalized-recommendations-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        <div class="loader"></div>
                        <div class="loader"></div>
                        <div class="loader"></div>
                        <p class="text-gray-500 col-span-full text-center">جاري تحميل التوصيات المخصصة...</p>
                    </div>
                    <div class="text-center mt-6">
                        <button id="load-more-recommendations" class="btn btn-outline hidden hover:bg-secondary hover:text-white transition-all duration-300" onclick="loadMoreRecommendations()">
                            <i class="fa-solid fa-plus mr-2"></i>
                            Load More Recommendations
                            <span id="recommendations-count" class="ml-2 text-xs bg-secondary text-white px-2 py-1 rounded-full"></span>
                        </button>
                        <div id="recommendations-complete" class="hidden text-center text-gray-600 mt-4">
                            <i class="fa-solid fa-check-circle text-green-500 mr-2"></i>
                            All recommendations loaded!
                        </div>
                    </div>
                </div>
            </section>
        `;
    personalizedRecsContainer.innerHTML = recSectionHtml;

    const personalizedRecommendationsGrid = personalizedRecsContainer.querySelector("#personalized-recommendations-grid");

    // Fetch personalized recommendations using recommendationService (with duplicate prevention)
    if (!isLoadingRecommendations) {
      isLoadingRecommendations = true;
      recommendationService.getPersonalizedRecs()
      .then(data => {
        // Check different possible data structures
        let recommendations = null;
        if (data && data.recommendations && Array.isArray(data.recommendations)) {
          recommendations = data.recommendations;
        } else if (data && Array.isArray(data.results)) {
          recommendations = data.results;
        } else if (data && Array.isArray(data)) {
          recommendations = data;
        }
        
        if (recommendations && recommendations.length > 0) {
          // Store all recommendations
          allRecommendations = recommendations.map(product => {
            // Fix backend data structure - map product_id to id
            if (product.product_id && !product.id) {
              product.id = product.product_id;
            }
            
            // Create slug from name if missing
            if (!product.slug && product.name) {
              product.slug = product.name.toLowerCase()
                .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '') // Keep Arabic and English letters
                .replace(/\s+/g, '-')
                .substring(0, 50);
            }
            
            return product;
          }).filter(product => product.name && product.id); // Filter out invalid products
          
          personalizedRecommendationsGrid.innerHTML = '';
          
          // Display initial recommendations
          const initialRecommendations = allRecommendations.slice(0, INITIAL_LOAD);
          renderProductsInGrid(initialRecommendations, personalizedRecommendationsGrid);
          displayedRecommendationsCount = initialRecommendations.length;
          
          // Make data available globally for ProductCard helper functions
          window.allRecommendations = allRecommendations;
          
          // Update load more button
          updateLoadMoreButton('load-more-recommendations', 'recommendations-count', displayedRecommendationsCount, allRecommendations.length);
        } else {
          // Display message from backend or default no recommendations message
          const message = (data && data.message) || 'لا توجد توصيات مخصصة حاليا.';
          personalizedRecommendationsGrid.innerHTML = `<p class="text-gray-500 col-span-full text-center">${message}</p>`;
          
          // Hide load more button
          const loadMoreButton = page.querySelector('#load-more-recommendations');
          if (loadMoreButton) loadMoreButton.classList.add('hidden');
        }
      })
      .catch((err) => {
        console.error('Error loading personalized recommendations:', err);
        personalizedRecommendationsGrid.innerHTML = `<p class="text-danger col-span-full text-center">تعذر تحميل التوصيات المخصصة.</p>`;
        
        // Hide load more button on error
        const loadMoreButton = page.querySelector('#load-more-recommendations');
        if (loadMoreButton) loadMoreButton.classList.add('hidden');
      })
      .finally(() => {
        isLoadingRecommendations = false;
      });
    }
  } else {
    console.warn('Personalized recommendations container not found in DOM');
  }

  // Handle Trending Products Section (only for non-store owners)
  const trendingProductsContainer = page.querySelector("#trending-products-section");
  
  if (trendingProductsContainer && !isStoreOwner) {
    const trendingSectionHtml = `
            <section class="py-16 bg-gray-50">
                <div class="container mx-auto px-4">
                    <div class="flex justify-between items-center mb-8">
                        <h2 class="text-2xl font-bold">🔥 Trending Products</h2>
                        <a href="#/products" class="text-secondary font-bold">View All &rarr;</a>
                    </div>
                    <div id="trending-products-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        <div class="loader"></div>
                        <div class="loader"></div>
                        <div class="loader"></div>
                        <p class="text-gray-500 col-span-full text-center">جاري تحميل المنتجات الرائجة...</p>
                    </div>
                    <div class="text-center mt-6">
                        <button id="load-more-trending" class="btn btn-outline hidden hover:bg-secondary hover:text-white transition-all duration-300" onclick="loadMoreTrending()">
                            <i class="fa-solid fa-plus mr-2"></i>
                            Load More Trending
                            <span id="trending-count" class="ml-2 text-xs bg-secondary text-white px-2 py-1 rounded-full"></span>
                        </button>
                        <div id="trending-complete" class="hidden text-center text-gray-600 mt-4">
                            <i class="fa-solid fa-check-circle text-green-500 mr-2"></i>
                            All trending products loaded!
                        </div>
                    </div>
                </div>
            </section>
        `;
    trendingProductsContainer.innerHTML = trendingSectionHtml;

    const trendingProductsGrid = trendingProductsContainer.querySelector("#trending-products-grid");

    // Fetch trending products using recommendationService (with duplicate prevention)
    if (!isLoadingTrending) {
      isLoadingTrending = true;
      recommendationService.getTrendingProducts(20)
      .then(data => {
        // Check different possible data structures
        let trendingProducts = null;
        if (data && data.recommendations && Array.isArray(data.recommendations)) {
          trendingProducts = data.recommendations;
        } else if (data && Array.isArray(data.results)) {
          trendingProducts = data.results;
        } else if (data && Array.isArray(data)) {
          trendingProducts = data;
        }
        
        if (trendingProducts && trendingProducts.length > 0) {
          // Store all trending products
          allTrendingProducts = trendingProducts.map(product => {
            // Fix backend data structure - map product_id to id
            if (product.product_id && !product.id) {
              product.id = product.product_id;
            }
            
            // Create slug from name if missing
            if (!product.slug && product.name) {
              product.slug = product.name.toLowerCase()
                .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '') // Keep Arabic and English letters
                .replace(/\s+/g, '-')
                .substring(0, 50);
            }
            
            return product;
          }).filter(product => product.name && product.id); // Filter out invalid products
          
          trendingProductsGrid.innerHTML = '';
          
          // Display initial trending products
          const initialTrending = allTrendingProducts.slice(0, INITIAL_LOAD);
          renderProductsInGrid(initialTrending, trendingProductsGrid);
          displayedTrendingCount = initialTrending.length;
          
          // Make data available globally for ProductCard helper functions
          window.allTrendingProducts = allTrendingProducts;
          
          // Update load more button
          updateLoadMoreButton('load-more-trending', 'trending-count', displayedTrendingCount, allTrendingProducts.length);
        } else {
          // Display message from backend or default no trending message
          const message = (data && data.message) || 'لا توجد منتجات رائجة حاليا.';
          trendingProductsGrid.innerHTML = `<p class="text-gray-500 col-span-full text-center">${message}</p>`;
          
          // Hide load more button
          const loadMoreButton = page.querySelector('#load-more-trending');
          if (loadMoreButton) loadMoreButton.classList.add('hidden');
        }
      })
      .catch((err) => {
        console.error('Error loading trending products:', err);
        trendingProductsGrid.innerHTML = `<p class="text-danger col-span-full text-center">تعذر تحميل المنتجات الرائجة.</p>`;
        
        // Hide load more button on error
        const loadMoreButton = page.querySelector('#load-more-trending');
        if (loadMoreButton) loadMoreButton.classList.add('hidden');
      })
      .finally(() => {
        isLoadingTrending = false;
      });
    }
  } else {
    console.warn('Trending products container not found in DOM');
  }

  // Fetch and render products for New Arrivals (only for non-store owners)
  const newArrivalsGrid = page.querySelector("#new-arrivals-grid");
  if (newArrivalsGrid && !isStoreOwner) {
    productService
      .getProducts() // Fetch all products
      .then((data) => {
      // Store all new arrivals
      allNewArrivals = data.results.map(product => {
        // Patch product data for legacy compatibility
        if (!product.id && product.slug) product.id = product.slug;
        if (!product.slug && product.id) product.slug = product.id;
        if (!product.image_url && Array.isArray(product.image_urls) && product.image_urls.length > 0) product.image_url = product.image_urls[0];
        if (!product.short_description && product.description) product.short_description = product.description;
        return product;
      });
      
      newArrivalsGrid.innerHTML = '';
      
      // Display initial products
      const initialProducts = allNewArrivals.slice(0, INITIAL_LOAD);
      renderProductsInGrid(initialProducts, newArrivalsGrid);
      displayedArrivalsCount = initialProducts.length;
      
      // Make data available globally for ProductCard helper functions
      window.allNewArrivals = allNewArrivals;
      
      // Update load more button
      updateLoadMoreButton('load-more-arrivals', 'arrivals-count', displayedArrivalsCount, allNewArrivals.length);
    })
    .catch((err) => {
      newArrivalsGrid.innerHTML = `<p class="text-danger col-span-full text-center">Could not load new arrivals.</p>`;
      console.error('Error loading new arrivals:', err);
    });
  }

  const categoryGrid = page.querySelector("#category-grid");

  // Fetch all products to generate dynamic categories (only for non-store owners)
  // Load categories with better error handling and loading states
  async function loadCategories() {
    if (isStoreOwner) return; // Skip loading categories for store owners
    try {
      const data = await productService.getProducts(); // Fetches all products to derive categories
      const products = data.results || data;

      // Generate categories from actual product data
      const categoryMap = new Map();
      const categoryIcons = {
        "Electronics": "fa-microchip",
        "Clothing": "fa-tshirt",
        "Home & Garden": "fa-home",
        "Sports & Outdoors": "fa-running",
        "Books": "fa-book",
        "Health & Beauty": "fa-heart",
        "Toys & Games": "fa-gamepad",
        "Automotive": "fa-car",
        "Jewelry": "fa-gem",
        "Food & Beverages": "fa-utensils",
        "Office Supplies": "fa-briefcase",
        "Pet Supplies": "fa-paw"
      };

      // Count products per category
      const categoryProductCount = new Map();

      products.forEach(product => {
        if (product.category && product.category.name) {
          const categoryName = product.category.name;

          // Count products
          categoryProductCount.set(categoryName, (categoryProductCount.get(categoryName) || 0) + 1);

          // Add to category map if not exists
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
              name: categoryName,
              slug: product.category.slug,
              description: product.category.description,
              icon: categoryIcons[categoryName] || "fa-tag",
              productCount: 0
            });
          }
        }
      });

      // Update product counts
      categoryMap.forEach((category, name) => {
        category.productCount = categoryProductCount.get(name) || 0;
      });

      const categories = Array.from(categoryMap.values())
        .sort((a, b) => b.productCount - a.productCount); // Sort by product count

      if (categories.length === 0) {
        categoryGrid.innerHTML = `
          <div class="col-span-full text-center py-12">
            <div class="text-gray-400 text-6xl mb-4">
              <i class="fa-solid fa-box-open"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-600 mb-2">No Categories Available</h3>
            <p class="text-gray-500">Categories will be added soon</p>
          </div>
        `;
        return;
      }

      // Add category statistics
      const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0);
      const avgProductsPerCategory = Math.round(totalProducts / categories.length);

      // Update statistics display with animation
      const statsContainer = document.getElementById('category-stats');
      if (statsContainer) {
        // Animate numbers counting up
        animateNumber('total-categories', 0, categories.length, 1000);
        animateNumber('total-products', 0, totalProducts, 1500);
        animateNumber('avg-products', 0, avgProductsPerCategory, 1200);
        statsContainer.style.display = 'block';
      }

      // Show search box if there are categories
      const searchBox = document.getElementById('category-search');
      if (searchBox && categories.length > 6) {
        searchBox.style.display = 'block';
        setupCategorySearch(categories);
      }

      // Display categories using the new function
      displayCategories(categories.slice(0, 12));
    } catch (error) {
      console.error('Error loading categories:', error);
      categoryGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-danger text-4xl mb-4">
            <i class="fa-solid fa-exclamation-triangle"></i>
          </div>
          <h3 class="text-xl font-bold text-danger mb-2">خطأ في تحميل التصنيفات</h3>
          <p class="text-gray-500 mb-4">حدث خطأ أثناء تحميل التصنيفات. يرجى المحاولة مرة أخرى.</p>
          <button onclick="location.reload()" class="btn btn-outline">
            <i class="fa-solid fa-refresh mr-2"></i>
            إعادة المحاولة
          </button>
        </div>
      `;
    }
  }

  // Utility function to animate numbers
  function animateNumber(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startTime = performance.now();
    const range = end - start;

    function updateNumber(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(start + (range * easeOutQuart));

      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      }
    }

    requestAnimationFrame(updateNumber);
  }

  // Setup category search functionality
  function setupCategorySearch(allCategories) {
    const searchInput = document.getElementById('category-search');
    const categoryGrid = document.getElementById('category-grid');

    if (!searchInput || !categoryGrid) return;

    searchInput.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase().trim();

      if (searchTerm === '') {
        // Show all categories
        displayCategories(allCategories.slice(0, 12));
      } else {
        // Filter categories
        const filteredCategories = allCategories.filter(cat =>
          cat.name.toLowerCase().includes(searchTerm) ||
          (cat.description && cat.description.toLowerCase().includes(searchTerm))
        );
        displayCategories(filteredCategories.slice(0, 12));
      }
    });
  }

  // Function to display categories
  function displayCategories(categories) {
    const categoryGrid = document.getElementById('category-grid');
    if (!categoryGrid) return;

    if (categories.length === 0) {
      categoryGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-gray-400 text-4xl mb-4">
            <i class="fa-solid fa-search"></i>
          </div>
          <h3 class="text-lg font-bold text-gray-600 mb-2">No categories found</h3>
          <p class="text-gray-500">Try a different search term</p>
        </div>
      `;
      return;
    }

    categoryGrid.innerHTML = categories
      .map(
        (cat) => `
          <div class="category-card" onclick="filterByCategory('${cat.slug}', '${cat.name}', this)" tabindex="0" role="button" aria-label="Browse ${cat.name} products">
              <div class="category-icon-container">
                  <i class="fa-solid ${cat.icon}"></i>
              </div>

              <div>
                  <h4 class="category-name">${cat.name}</h4>
                  <p class="category-count">
                      ${cat.productCount} ${cat.productCount === 1 ? 'product' : 'products'}
                  </p>
              </div>

              <div class="category-arrow">
                  <i class="fa-solid fa-arrow-right"></i>
              </div>
          </div>
      `,
      )
      .join("");
  }

  // Load categories
  loadCategories();

  // Global function for category filtering with enhanced UX
  window.filterByCategory = function(categorySlug, categoryName, element) {
    // Add visual feedback
    const clickedCard = element || document.activeElement;
    if (clickedCard && clickedCard.classList.contains('category-card')) {
      clickedCard.style.transform = 'scale(0.95)';
      setTimeout(() => {
        clickedCard.style.transform = '';
      }, 150);
    }

    // Navigate to products page with category filter
    location.hash = `/products?category=${encodeURIComponent(categoryName)}`;
  };

  // Add keyboard support for category cards
  document.addEventListener('keydown', function(e) {
    if (e.target.classList.contains('category-card') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.target.click();
    }
  });

  // Function to render products in grid
  function renderProductsInGrid(products, grid) {
    if (!products || !Array.isArray(products)) {
      console.warn('Invalid products data provided to renderProductsInGrid');
      return;
    }
    
    products.forEach(product => {
      const cardElem = ProductCard(product);
      if (typeof cardElem === 'string') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = cardElem;
        const cardElement = tempDiv.firstElementChild;
        if (cardElement) {
          // Add behavior tracking to product card
          addBehaviorTracking(cardElement, product);
          grid.appendChild(cardElement);
        }
      } else if (cardElem && cardElem.nodeType === Node.ELEMENT_NODE) {
        // Add behavior tracking to product card
        addBehaviorTracking(cardElem, product);
        grid.appendChild(cardElem);
      }
    });
  }

  // Function to add behavior tracking to product cards
  function addBehaviorTracking(cardElement, product) {
    if (!cardElement || !product) return;

    // Set product ID as data attribute
    cardElement.setAttribute('data-product-id', product.id);

    // Track product view when card comes into viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          behaviorTracker.trackProductView(product.id);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    observer.observe(cardElement);

    // Track clicks on product card
    cardElement.addEventListener('click', (e) => {
      // Don't track if clicking on buttons
      if (e.target.closest('button') || e.target.closest('.btn')) {
        return;
      }
      behaviorTracker.trackProductView(product.id);
    });

    // Track like button clicks
    const likeBtn = cardElement.querySelector('[data-action="like"], .like-btn');
    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isLiked = likeBtn.classList.contains('liked');
        behaviorTracker.trackProductLike(product.id, !isLiked);
      });
    }

    // Track add to cart button clicks
    const addToCartBtn = cardElement.querySelector('[data-action="add-to-cart"], .add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        behaviorTracker.trackAddToCart(product.id);
      });
    }

    // Track wishlist button clicks
    const wishlistBtn = cardElement.querySelector('[data-action="wishlist"], .wishlist-btn');
    if (wishlistBtn) {
      wishlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isInWishlist = wishlistBtn.classList.contains('in-wishlist');
        if (isInWishlist) {
          behaviorTracker.trackWishlistRemove(product.id);
        } else {
          behaviorTracker.trackWishlistAdd(product.id);
        }
      });
    }
  }

  // Function to update load more button
  function updateLoadMoreButton(buttonId, countId, displayedCount, totalCount) {
    const button = page.querySelector(`#${buttonId}`);
    const countSpan = page.querySelector(`#${countId}`);
    const completeId = buttonId.replace('load-more-', '') + '-complete';
    const completeDiv = page.querySelector(`#${completeId}`);

    if (button && countSpan) {
      if (displayedCount < totalCount) {
        button.classList.remove('hidden');
        countSpan.textContent = `${displayedCount}/${totalCount}`;
        if (completeDiv) completeDiv.classList.add('hidden');
      } else {
        button.classList.add('hidden');
        if (completeDiv) completeDiv.classList.remove('hidden');
      }
    }
  }

  // Global functions for load more buttons
  window.loadMoreRecommendations = function() {
    const button = page.querySelector('#load-more-recommendations');
    const recommendationsGrid = page.querySelector('#personalized-recommendations-grid');
    
    if (!allRecommendations || !recommendationsGrid) return;
    
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...';
    button.disabled = true;
    
    setTimeout(() => {
      const nextRecommendations = allRecommendations.slice(displayedRecommendationsCount, displayedRecommendationsCount + LOAD_MORE_INCREMENT);
      renderProductsInGrid(nextRecommendations, recommendationsGrid);
      displayedRecommendationsCount += nextRecommendations.length;
      
      // Update button
      updateLoadMoreButton('load-more-recommendations', 'recommendations-count', displayedRecommendationsCount, allRecommendations.length);
      button.innerHTML = originalText;
      button.disabled = false;
    }, 500);
  };

  window.loadMoreArrivals = function() {
    const button = page.querySelector('#load-more-arrivals');
    const newArrivalsGrid = page.querySelector('#new-arrivals-grid');
    
    if (!allNewArrivals || !newArrivalsGrid) return;
    
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...';
    button.disabled = true;
    
    setTimeout(() => {
      const nextProducts = allNewArrivals.slice(displayedArrivalsCount, displayedArrivalsCount + LOAD_MORE_INCREMENT);
      renderProductsInGrid(nextProducts, newArrivalsGrid);
      displayedArrivalsCount += nextProducts.length;
      
      // Update button
      updateLoadMoreButton('load-more-arrivals', 'arrivals-count', displayedArrivalsCount, allNewArrivals.length);
      button.innerHTML = originalText;
      button.disabled = false;
    }, 500);
  };

  window.loadMoreTrending = function() {
    const button = page.querySelector('#load-more-trending');
    const trendingGrid = page.querySelector('#trending-products-grid');
    
    if (!allTrendingProducts || !trendingGrid) return;
    
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading...';
    button.disabled = true;
    
    setTimeout(() => {
      const nextProducts = allTrendingProducts.slice(displayedTrendingCount, displayedTrendingCount + LOAD_MORE_INCREMENT);
      renderProductsInGrid(nextProducts, trendingGrid);
      displayedTrendingCount += nextProducts.length;
      
      // Update button
      updateLoadMoreButton('load-more-trending', 'trending-count', displayedTrendingCount, allTrendingProducts.length);
      button.innerHTML = originalText;
      button.disabled = false;
    }, 500);
  };

  // Global function to refresh recommendations
  window.refreshRecommendations = function() {
    const button = page.querySelector('#refresh-recommendations');
    const recommendationsGrid = page.querySelector('#personalized-recommendations-grid');
    
    if (!button || !recommendationsGrid) return;
    
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Refreshing...';
    button.disabled = true;
    
    // Show loading state
    recommendationsGrid.innerHTML = `
      <div class="loader"></div>
      <div class="loader"></div>
      <div class="loader"></div>
      <p class="text-gray-500 col-span-full text-center">جاري تحديث التوصيات المخصصة...</p>
    `;
    
    // Fetch fresh recommendations
    recommendationService.getPersonalizedRecs()
      .then(data => {
        // Check different possible data structures
        let recommendations = null;
        if (data && data.recommendations && Array.isArray(data.recommendations)) {
          recommendations = data.recommendations;
        } else if (data && Array.isArray(data.results)) {
          recommendations = data.results;
        } else if (data && Array.isArray(data)) {
          recommendations = data;
        }
        
        if (recommendations && recommendations.length > 0) {
          // Store all recommendations
          allRecommendations = recommendations.map(product => {
            // Fix backend data structure - map product_id to id
            if (product.product_id && !product.id) {
              product.id = product.product_id;
            }
            
            // Create slug from name if missing
            if (!product.slug && product.name) {
              product.slug = product.name.toLowerCase()
                .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '') // Keep Arabic and English letters
                .replace(/\s+/g, '-')
                .substring(0, 50);
            }
            
            return product;
          }).filter(product => product.name && product.id); // Filter out invalid products
          
          recommendationsGrid.innerHTML = '';
          
          // Display initial recommendations
          const initialRecommendations = allRecommendations.slice(0, INITIAL_LOAD);
          renderProductsInGrid(initialRecommendations, recommendationsGrid);
          displayedRecommendationsCount = initialRecommendations.length;
          
          // Make data available globally for ProductCard helper functions
          window.allRecommendations = allRecommendations;
          
          // Update load more button
          updateLoadMoreButton('load-more-recommendations', 'recommendations-count', displayedRecommendationsCount, allRecommendations.length);
        } else {
          // Display message from backend or default no recommendations message
          const message = (data && data.message) || 'لا توجد توصيات مخصصة حاليا.';
          recommendationsGrid.innerHTML = `<p class="text-gray-500 col-span-full text-center">${message}</p>`;
          
          // Hide load more button
          const loadMoreButton = page.querySelector('#load-more-recommendations');
          if (loadMoreButton) loadMoreButton.classList.add('hidden');
        }
      })
      .catch((err) => {
        console.error('Error refreshing personalized recommendations:', err);
        recommendationsGrid.innerHTML = `<p class="text-danger col-span-full text-center">تعذر تحديث التوصيات المخصصة.</p>`;
        
        // Hide load more button on error
        const loadMoreButton = page.querySelector('#load-more-recommendations');
        if (loadMoreButton) loadMoreButton.classList.add('hidden');
      })
      .finally(() => {
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
      });
  };

  return page;
}