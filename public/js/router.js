import WishlistPage from "./pages/WishlistPage.js"
import HomePage from "./pages/HomePage.js"
import LoginPage from "./pages/LoginPage.js"
import RegisterPage from "./pages/RegisterPage.js"
import ProductListPage from "./pages/ProductListPage.js"
import ProductDetailPage from "./pages/ProductDetailPage.js"
import CartPage from "./pages/CartPage.js"
import DashboardPage from "./pages/DashboardPage.js"
import StoreOwnerDashboard from "./pages/StoreOwnerDashboard.js"
import ProductManagementPage from "./pages/ProductManagementPage.js"
import ProductFormPage from "./pages/ProductFormPage.js"
import AboutPage from "./pages/AboutPage.js"
import ContactPage from "./pages/ContactPage.js"
import NotFoundPage from "./pages/NotFoundPage.js"
import CreateStorePage from "./pages/CreateStore.js"
import store from "./state/store.js"

// Define the routes and their corresponding page components
import ReportsPage from "./pages/ReportsPage.js"
import ComparePage from "./pages/ComparePage.js"
const routes = {
  "/": HomePage,
  "/login": LoginPage,
  "/register": RegisterPage,
  "/products": ProductListPage,
  "/products/:id": ProductDetailPage,
  "/cart": CartPage,
  "/dashboard": DashboardPage,
  "/store-dashboard": StoreOwnerDashboard,
  "/products-management": ProductManagementPage,
  "/products/add": () => ProductFormPage(),
  "/products/edit/:id": (params) => ProductFormPage(params.id),
  "/about": AboutPage,
  "/contact": ContactPage,
  "/create-store": CreateStorePage,
  "/reports": ReportsPage,
  "/compare": ComparePage,
  "/wishlist": WishlistPage

  // Add more routes as needed
}
/**
 * A simple client-side router.
 * It parses the URL hash and renders the corresponding page.
 */
export const router = () => {
  const pageContainer = document.getElementById("page-container")


  const navigate = async () => {
    // Get the path and query from the URL hash, or default to '/'
    let hash = location.hash.slice(1) || "/";
    let [path, queryString] = hash.split("?");
    path = path.toLowerCase();

    // Handle dynamic routes like /products/:id
    let routeHandler = routes[path];
    let params = null;

    if (!routeHandler) {
      const dynamicRoute = Object.keys(routes).find((route) => {
        const routeParts = route.split("/");
        const pathParts = path.split("/");
        if (routeParts.length !== pathParts.length) return false;

        const potentialParams = {};
        const match = routeParts.every((part, i) => {
          if (part.startsWith(":")) {
            potentialParams[part.slice(1)] = pathParts[i];
            return true;
          }
          return part === pathParts[i];
        });

        if (match) {
          params = potentialParams;
          return true;
        }
        return false;
      });

      routeHandler = dynamicRoute ? routes[dynamicRoute] : NotFoundPage;
    }

    // Attach query params if present
    if (queryString) {
      params = params || {};
      params.query = queryString;
    }

    // Check if this is a protected route
    const protectedRoutes = ["/dashboard", "/store-dashboard", "/products-management", "/products/add", "/products/edit", "/create-store", "/reports"];
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
    
    // For protected routes, check authentication with a small delay to allow state initialization
    if (isProtectedRoute) {
      // Check if we have tokens in localStorage (quick check)
      const hasTokens = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      if (!hasTokens) {
        // No tokens at all, redirect to login
        location.hash = "/login";
        return;
      }
      
      // If we have tokens but store state isn't ready yet, wait a bit
      if (!store.getState().isAuthenticated) {
        // Give the auth system time to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check again after waiting
        if (!store.getState().isAuthenticated) {
          location.hash = "/login";
          return;
        }
      }
    }

    // Render the page
    if (pageContainer) {
      pageContainer.innerHTML = ""; // Clear previous content
      let pageElement;
      try {
        pageElement = await routeHandler(params);
      } catch (err) {
        console.error("router: Error while loading page", err);
        pageContainer.innerHTML = `<div class='text-danger p-8 text-center'>Error loading page.</div>`;
        return;
      }
      if (pageElement instanceof Node) {
        pageContainer.appendChild(pageElement);
        pageContainer.classList.add("page-enter");
        setTimeout(() => pageContainer.classList.remove("page-enter"), 500);
      } else {
        console.error("router: Tried to append non-Node element", pageElement);
        pageContainer.innerHTML = `<div class='text-danger p-8 text-center'>Error: Page did not return a valid DOM Node.</div>`;
      }
    }
  }

  // Listen for hash changes to navigate
  window.addEventListener("hashchange", navigate)

  // Initial navigation
  navigate()
}
