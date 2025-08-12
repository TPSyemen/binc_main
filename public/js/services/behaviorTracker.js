import { behaviorService } from "./api.js"
import { debounce } from "../utils/helpers.js?v=2024"

/**
 * Logs a user behavior event to the backend.
 * @param {string} action_type - The type of action (e.g., 'VIEW', 'CLICK').
 * @param {object} metadata - Additional data about the event.
 */
const logBehavior = (action_type, metadata = {}) => {
  const { product, ...restMeta } = metadata
  const payload = {
    action_type,
    product: product ? product.id : null,
    metadata: Object.keys(restMeta).length > 0 ? restMeta : null,
  }
  behaviorService.log(payload).catch((err) => console.error("Failed to log behavior:", err))
}

// Debounced version of the search logger to avoid spamming the API on every keystroke
const debouncedLogSearch = debounce((query) => {
  if (query.length > 2) {
    logBehavior("SEARCH", { query })
  }
}, 500)

/**
 * Initializes event listeners to track user behavior across the site.
 */
export function initBehaviorTracker() {
  // Track page views on hash change
  window.addEventListener("hashchange", () => {
    logBehavior("VIEW", { page: location.hash || "#/" })
  })

  // Track clicks on specific elements
  document.body.addEventListener("click", (e) => {
    const productCard = e.target.closest("[data-product-id]")
    if (productCard) {
      logBehavior("CLICK", { product: { id: productCard.dataset.productId } })
    }
  })

  // Example of tracking search input
  // This would be attached to the search input field when it's rendered
  // document.getElementById('search-input').addEventListener('input', (e) => {
  //     debouncedLogSearch(e.target.value);
  // });
}
