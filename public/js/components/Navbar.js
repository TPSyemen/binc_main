import store from "../state/store.js";

/**
 * Renders the navigation bar.
 * It dynamically updates based on the user's authentication state.
 * @param {HTMLElement} container - The container element to render the navbar into.
 */
export function renderNavbar(container) {
  if (!container) return;

  // Cache for store info to avoid repeated API calls (shared across renders)
  if (!window.navbarStoreInfoCache) {
    window.navbarStoreInfoCache = null;
    window.navbarStoreInfoFetching = false;
  }

  async function render() {
    const { isAuthenticated, user } = store.getState();
    
    // Get store information for store owners
    let storeInfo = null;
    if (user && user.role === 'store_owner') {
      // First check if store info is already in user object
      if (user.store_name && user.store_name !== 'undefined' && user.store_name !== null) {
        storeInfo = {
          name: user.store_name,
          id: user.store_id
        };
      } else if (window.navbarStoreInfoCache) {
        // Use cached store info
        storeInfo = window.navbarStoreInfoCache;
      } else if (window.dashboardService && !window.navbarStoreInfoFetching) {
        // If not in user object and not already fetching, fetch from API
        window.navbarStoreInfoFetching = true;
        try {
          const fetchedStore = await window.dashboardService.getMyStore(); // eslint-disable-line no-undef
          if (fetchedStore && fetchedStore.name && fetchedStore.name !== 'undefined' && fetchedStore.name !== null) {
            storeInfo = fetchedStore;
            window.navbarStoreInfoCache = fetchedStore; // Cache the result
            
            // Update user data in store state with fetched store info
            const currentState = store.getState();
            if (currentState.user && currentState.user.role === 'store_owner') {
              const updatedUser = {
                ...currentState.user,
                store_name: fetchedStore.name,
                store_id: fetchedStore.id
              };
              store.setState({
                ...currentState,
                user: updatedUser
              });
            }
          }
        } catch (error) {
          console.warn('Failed to fetch store info for navbar:', error);
          // Don't show error to user, just use fallback display
        } finally {
          window.navbarStoreInfoFetching = false;
        }
      }
    }

    const authLinks = isAuthenticated
    ? `
            ${user.role === 'store_owner' ? `
                <div class="relative group">
                    <button class="flex items-center gap-2 hover:text-blue-600 transition-colors">
                        <i class="fa-solid fa-store text-xl"></i> 
                        <span>${storeInfo && storeInfo.name ? storeInfo.name : 'My Store'}</span>
                        <i class="fa-solid fa-chevron-down text-xs"></i>
                    </button>
                    <div class="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div class="py-2">
                            <a href="#/store-dashboard" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <i class="fa-solid fa-chart-line mr-2"></i>
                                Dashboard
                            </a>
                            <a href="#/products-management" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <i class="fa-solid fa-box mr-2"></i>
                                Products
                            </a>
                            <a href="#/products/add" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <i class="fa-solid fa-plus mr-2"></i>
                                Add Product
                            </a>
                            <div class="border-t border-gray-200 my-1"></div>
                            <a href="#/reports" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <i class="fa-solid fa-file-alt mr-2"></i>
                                Reports
                            </a>
                        </div>
                    </div>
                </div>
            ` : ''}
            <a href="#/dashboard" class="flex items-center gap-2">
                <i class="fa-solid fa-user-circle text-xl"></i>
                <span>${user.username}</span>
            </a>
            <a href="#" id="logout-btn" class="flex items-center gap-2">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Logout</span>
            </a>
        `
    : `
            <a href="#/login" class="font-bold text-secondary">Login</a>
            <span class="text-gray-300">/</span>
            <a href="#/register" class="font-bold text-secondary">Register</a>
        `

  const html = `
        <nav class="bg-white shadow-sm sticky top-0 z-50">
            <div class="container mx-auto px-4">
                <!-- Top bar -->
                <div class="hidden md:flex justify-between items-center py-2 text-sm text-muted border-b">
                    <div>
                        <span>776468322</span>
                        <span class="mx-2">|</span>
                        <span>ttt.ppp.sss.77@gmail.com</span>
                    </div>
                    <div>Follow Us and get a chance to win 80% off</div>
                </div>
                <!-- Main nav -->
                <div class="flex justify-between items-center py-4">
                    <a href="#/" class="text-2xl font-extrabold text-primary flex items-center gap-2 hover:text-secondary transition-colors">
                        <div class="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm">
                            <<img src="/assets/logo.png" alt="" class="w-full h-full object-cover"> 
                        </div>
                        Best in Click
                    </a>
                    <div class="hidden lg:flex items-center gap-6 text-muted font-bold">
                        <a href="#/" class="hover:text-secondary transition-colors">Home</a>
                        ${user && user.role === 'store_owner' ? '' : '<a href="#/products" class="hover:text-secondary transition-colors">Products</a>'}
                        <a href="#/about" class="hover:text-secondary transition-colors">About</a>
                        <a href="#/contact" class="hover:text-secondary transition-colors">Contact</a>
                    </div>

                    <!-- Mobile menu button -->
                    <button class="lg:hidden text-primary" onclick="toggleMobileMenu()">
                        <i class="fa-solid fa-bars text-xl"></i>
                    </button>
                    <div class="flex items-center gap-4 text-secondary font-bold">
                        ${authLinks}
                        <button class="flex items-center gap-1 hover:text-blue-600 transition-colors" onclick="toggleSearch()" title="Search">
                            <i class="fa-solid fa-search"></i>
                        </button>
                        <div class="relative">
                            <a href="#/cart" class="flex items-center gap-1 hover:text-blue-600 transition-colors relative" title="Shopping Cart">
                                <i class="fa-solid fa-shopping-cart"></i>
                                <span class="cart-badge text-xs bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center absolute -top-2 -right-2" style="display: none;">0</span>
                            </a>
                        </div>
                        <a href="#/wishlist" class="flex items-center gap-1 hover:text-blue-600 transition-colors relative" title="Favorites">
                            <i class="fa-solid fa-heart"></i>
                            <span class="wishlist-badge text-xs bg-danger text-white rounded-full w-5 h-5 flex items-center justify-center absolute -top-2 -right-2" style="display: none;">0</span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Mobile Menu (Hidden by default) -->
            <div id="mobile-menu" class="hidden lg:hidden border-t bg-white">
                <div class="container mx-auto px-4 py-4">
                    <div class="flex flex-col space-y-4">
                        <a href="#/" class="text-muted hover:text-secondary transition-colors font-bold">Home</a>
                        ${user && user.role === 'store_owner' ? '' : '<a href="#/products" class="text-muted hover:text-secondary transition-colors font-bold">Products</a>'}
                        <a href="#/about" class="text-muted hover:text-secondary transition-colors font-bold">About</a>
                        <a href="#/contact" class="text-muted hover:text-secondary transition-colors font-bold">Contact</a>
                        <div class="border-t pt-4">
                            ${authLinks}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Search Bar (Hidden by default) -->
            <div id="search-bar" class="hidden border-t bg-light-gray">
                <div class="container mx-auto px-4 py-4">
                    <div class="flex gap-2">
                        <input type="search" placeholder="Search for products..." class="input-field flex-1" id="global-search">
                        <button class="btn btn-primary" onclick="performSearch()">
                            <i class="fa-solid fa-search"></i>
                        </button>
                        <button class="btn btn-outline" onclick="toggleSearch()">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `

    container.innerHTML = html

    // Add event listener for logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        // Use the global auth service if available
        if (window.auth) { // eslint-disable-line no-undef
          await window.auth.logout(); // eslint-disable-line no-undef
        } else {
          // Fallback to manual logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          store.setState({ isAuthenticated: false, user: null, token: null });
          
          // Clear navbar cache
          if (window.clearNavbarCache) {
            window.clearNavbarCache();
          }
          
          location.hash = "/";
        }
      });
    }

    // Cart functionality is handled by direct navigation to cart page

    // Add global functions for navbar interactions
    window.toggleSearch = function() {
      const searchBar = document.getElementById("search-bar");
      const searchInput = document.getElementById("global-search");

      if (searchBar.classList.contains("hidden")) {
        searchBar.classList.remove("hidden");
        searchInput.focus();
      } else {
        searchBar.classList.add("hidden");
        searchInput.value = "";
      }
    };

    window.performSearch = function() {
      const searchInput = document.getElementById("global-search");
      const query = searchInput.value.trim();

      if (query) {
        location.hash = `/products?search=${encodeURIComponent(query)}`;
        window.toggleSearch(); // Close search bar
      }
    };

    window.toggleMobileMenu = function() {
      const mobileMenu = document.getElementById("mobile-menu");
      const menuButton = document.querySelector('[onclick="toggleMobileMenu()"] i');

      if (mobileMenu.classList.contains("hidden")) {
        mobileMenu.classList.remove("hidden");
        menuButton.classList.remove("fa-bars");
        menuButton.classList.add("fa-times");
      } else {
        mobileMenu.classList.add("hidden");
        menuButton.classList.remove("fa-times");
        menuButton.classList.add("fa-bars");
      }
    };

    // Add enter key support for search
    const searchInput = document.getElementById("global-search");
    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          window.performSearch();
        }
      });
    }
  }

  // Initial render
  render()

  // Subscribe to state changes
  store.addObserver(render);

  // Global function to refresh navbar when store is created/updated
  window.refreshNavbar = function() {
    render();
  };

  // Global function to update store info in navbar
  window.updateNavbarStoreInfo = function(storeData) {
    // Update cache
    window.navbarStoreInfoCache = storeData;
    
    // Update user data in store state
    const currentState = store.getState();
    if (currentState.user && currentState.user.role === 'store_owner') {
      const updatedUser = {
        ...currentState.user,
        store_name: storeData.name,
        store_id: storeData.id
      };
      store.setState({
        ...currentState,
        user: updatedUser
      });
    }
    // Refresh navbar to show updated store name
    render();
  };

  // Global function to clear navbar cache (called on logout)
  window.clearNavbarCache = function() {
    window.navbarStoreInfoCache = null;
    window.navbarStoreInfoFetching = false;
  };
}
