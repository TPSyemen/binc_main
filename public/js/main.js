import { renderNavbar } from "./components/Navbar.js"
import { renderFooter } from "./components/Footer.js"
import { router } from "./router.js"
import store from "./state/store.js"
import { initBehaviorTracker } from "./services/behaviorTracker.js"
import "./components/Cart.js"
import "./components/Auth.js"

/**
 * Main application entry point.
 * This function initializes the entire application.
 */
function main() {
  // Initialize the application state from localStorage
  store.initState()

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

  console.log("Best in Click App Initialized")
}

// Run the main function when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", main)
