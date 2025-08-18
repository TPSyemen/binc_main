import { renderNavbar } from "./components/Navbar.js"
import { renderFooter } from "./components/Footer.js"
import { router } from "./router.js"
import store from "./state/store.js"
import { initBehaviorTracker } from "./services/behaviorTracker.js"
import { dashboardService } from "./services/api.js"
import "./components/Cart.js"
import "./components/Auth.js"

/**
 * Main application entry point.
 * This function initializes the entire application.
 */
async function main() {
  // Initialize the application state from localStorage
  store.initState()

  // Make dashboardService available globally for components that need it
  window.dashboardService = dashboardService

  // Wait for auth initialization if needed
  if (window.auth && typeof window.auth.initAuth === 'function') {
    await window.auth.initAuth()
  }

  // Render static components like Navbar and Footer
  const navbarContainer = document.getElementById("navbar-container")
  const footerContainer = document.getElementById("footer-container")

  renderNavbar(navbarContainer)
  renderFooter(footerContainer)

  // Listen for state changes to re-render the navbar (e.g., on login/logout)
  store.addObserver(renderNavbar)

  // Initialize the client-side router
  router()

  // Initialize the user behavior tracker
  initBehaviorTracker()

  // Load test fixes in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    import('./utils/testFixes.js').then(({ testFixes }) => {
      // Tests will auto-run
    }).catch(error => {
      console.log('Test fixes not available:', error.message)
    })
  }

  console.log("Best in Click App Initialized")
}

// Run the main function when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", main)
