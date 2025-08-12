import { createElementFromHTML } from "../utils/helpers.js?v=2024"
import { productService, recommendationService } from "../services/api.js" // Import recommendationService
import { ProductCard } from "../components/ProductCard.js"
import store from "../state/store.js" // Import store for authentication check

/**
 * Renders the Home Page, inspired by the provided image.
 * @returns {HTMLElement} The page element.
 */
export default function HomePage() {
  const page = createElementFromHTML(`
        <div class="animate-fade-in">
            <section class="bg-gradient-to-r from-blue-50 to-indigo-50 py-20">
                <div class="container mx-auto px-4 text-center">
                    <h1 class="text-5xl font-extrabold text-primary mb-4">Limited Time Discount 40%</h1>
                    <p class="text-3xl text-muted font-medium mb-8">$385.00</p>
                    <div>
                        <a href="#/products" class="btn btn-primary mr-4">Buy Now</a>
                        <a href="#/compare" class="btn btn-outline">Compare Smartly</a>
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
                        <button onclick="location.hash='/products'" class="btn btn-outline group">
                            <span>View All Products</span>
                            <i class="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform duration-300"></i>
                        </button>
                    </div>
                </div>
            </section>

            <section class="bg-light-gray py-16">
                <div class="container mx-auto px-4">
                    <div class="flex justify-between items-center mb-8">
                        <h2 class="text-2xl font-bold">New Arrivals</h2>
                        <a href="#/products" class="text-secondary font-bold">View All &rarr;</a>
                    </div>
                    <div id="new-arrivals-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        <div class="loader"></div>
                    </div>
                </div>
            </section>

            <div id="personalized-recommendations-section"></div>

            </div>
    `);

  // Handle Personalized Recommendations Section
  const personalizedRecsContainer = page.querySelector("#personalized-recommendations-section");

  // Only show recommendations section if user is authenticated
  if (store.state.isAuthenticated) {
    const recSectionHtml = `
            <section class="py-16">
                <div class="container mx-auto px-4">
                    <div class="flex justify-between items-center mb-8">
                        <h2 class="text-2xl font-bold">Personalized Recommendations</h2>
                        <a href="#/products" class="text-secondary font-bold">View All &rarr;</a>
                    </div>
                    <div id="personalized-recommendations-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        <div class="loader"></div>
                        <div class="loader"></div>
                        <div class="loader"></div>
                        <p class="text-gray-500 col-span-full text-center">جاري تحميل التوصيات المخصصة...</p>
                    </div>
                </div>
            </section>
        `;
    personalizedRecsContainer.innerHTML = recSectionHtml;

    const personalizedRecommendationsGrid = personalizedRecsContainer.querySelector("#personalized-recommendations-grid");

    // Fetch personalized recommendations using recommendationService
    recommendationService.getPersonalizedRecs()
      .then(data => {
        if (data && data.recommendations && data.recommendations.length > 0) {
          personalizedRecommendationsGrid.innerHTML = '';
          // Patch product data for legacy compatibility
          data.recommendations.forEach(product => {
            if (!product.id && product.slug) product.id = product.slug;
            if (!product.slug && product.id) product.slug = product.id;
            if (!product.image_url && Array.isArray(product.image_urls) && product.image_urls.length > 0) product.image_url = product.image_urls[0];
            if (!product.short_description && product.description) product.short_description = product.description;
            const cardElem = ProductCard(product);
            // If ProductCard returns a string, convert to DOM
            if (typeof cardElem === 'string') {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = cardElem;
              personalizedRecommendationsGrid.appendChild(tempDiv.firstElementChild);
            } else {
              personalizedRecommendationsGrid.appendChild(cardElem);
            }
          });
        } else {
          // Display message from backend or default no recommendations message
          if (data && data.message) {
            personalizedRecommendationsGrid.innerHTML = `<p class="text-gray-500 col-span-full text-center">${data.message}</p>`;
          } else {
            personalizedRecommendationsGrid.innerHTML = `<p class="text-gray-500 col-span-full text-center">لا توجد توصيات مخصصة حاليا.</p>`;
          }
        }
      })
      .catch((err) => {
        console.error('Error loading personalized recommendations:', err);
        personalizedRecommendationsGrid.innerHTML = `<p class="text-danger col-span-full text-center">تعذر تحميل التوصيات المخصصة.</p>`;
      });
  } else {
    // If user is not authenticated, ensure the section is empty or hidden
    personalizedRecsContainer.innerHTML = "";
  }


  // Fetch and render products for New Arrivals
  const newArrivalsGrid = page.querySelector("#new-arrivals-grid");
  productService
    .getProducts("page_size=5") // Fetch 5 for new arrivals
    .then((data) => {
      newArrivalsGrid.innerHTML = '';
      data.results.forEach(product => {
        // Patch product data for legacy compatibility
        if (!product.id && product.slug) product.id = product.slug;
        if (!product.slug && product.id) product.slug = product.id;
        if (!product.image_url && Array.isArray(product.image_urls) && product.image_urls.length > 0) product.image_url = product.image_urls[0];
        if (!product.short_description && product.description) product.short_description = product.description;
        const cardElem = ProductCard(product);
        if (typeof cardElem === 'string') {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = cardElem;
          newArrivalsGrid.appendChild(tempDiv.firstElementChild);
        } else {
          newArrivalsGrid.appendChild(cardElem);
        }
      });
    })
    .catch((err) => {
      newArrivalsGrid.innerHTML = `<p class="text-danger col-span-full text-center">Could not load new arrivals.</p>`;
      console.error('Error loading new arrivals:', err);
    });

  const categoryGrid = page.querySelector("#category-grid");

  // Fetch all products to generate dynamic categories
  // Load categories with better error handling and loading states
  async function loadCategories() {
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

  return page;
}