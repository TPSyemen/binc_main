import { createElementFromHTML } from "../utils/helpers.js?v=2024"

/**
 * Creates a loading spinner component
 * @param {string} size - Size of the spinner ('sm', 'md', 'lg')
 * @param {string} message - Optional loading message
 * @returns {HTMLElement} The loading spinner element
 */
export function LoadingSpinner(size = 'md', message = '') {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }
  
  return createElementFromHTML(`
    <div class="flex flex-col items-center justify-center py-8">
      <div class="loader ${sizeClasses[size]} border-4 border-gray-200 border-t-secondary rounded-full animate-spin"></div>
      ${message ? `<p class="text-muted mt-4 text-center">${message}</p>` : ''}
    </div>
  `)
}

/**
 * Creates a skeleton loading component for cards
 * @param {number} count - Number of skeleton cards to show
 * @returns {HTMLElement} The skeleton loading element
 */
export function SkeletonCards(count = 3) {
  const skeletons = Array.from({length: count}, () => `
    <div class="card animate-pulse">
      <div class="skeleton h-48 rounded mb-4"></div>
      <div class="skeleton h-4 rounded mb-2"></div>
      <div class="skeleton h-4 rounded w-3/4 mb-4"></div>
      <div class="skeleton h-8 rounded w-1/2"></div>
    </div>
  `).join('')
  
  return createElementFromHTML(`
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      ${skeletons}
    </div>
  `)
}

/**
 * Creates a skeleton loading component for product details
 * @returns {HTMLElement} The skeleton loading element
 */
export function SkeletonProductDetail() {
  return createElementFromHTML(`
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
      <!-- Image skeleton -->
      <div class="space-y-4">
        <div class="skeleton aspect-square rounded-lg"></div>
        <div class="flex gap-2">
          <div class="skeleton w-20 h-20 rounded"></div>
          <div class="skeleton w-20 h-20 rounded"></div>
          <div class="skeleton w-20 h-20 rounded"></div>
        </div>
      </div>
      
      <!-- Info skeleton -->
      <div class="space-y-6">
        <div class="space-y-2">
          <div class="skeleton h-8 rounded w-3/4"></div>
          <div class="skeleton h-4 rounded w-1/2"></div>
        </div>
        
        <div class="space-y-2">
          <div class="skeleton h-6 rounded w-1/3"></div>
          <div class="skeleton h-4 rounded w-1/4"></div>
        </div>
        
        <div class="space-y-2">
          <div class="skeleton h-4 rounded"></div>
          <div class="skeleton h-4 rounded"></div>
          <div class="skeleton h-4 rounded w-2/3"></div>
        </div>
        
        <div class="space-y-4">
          <div class="skeleton h-12 rounded"></div>
          <div class="skeleton h-12 rounded"></div>
        </div>
      </div>
    </div>
  `)
}

/**
 * Shows a global loading overlay
 */
export function showGlobalLoading(message = 'Loading...') {
  const overlay = createElementFromHTML(`
    <div id="global-loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-8 max-w-sm mx-4">
        <div class="flex flex-col items-center">
          <div class="loader w-12 h-12 border-4 border-gray-200 border-t-secondary rounded-full animate-spin mb-4"></div>
          <p class="text-primary font-medium">${message}</p>
        </div>
      </div>
    </div>
  `)
  
  document.body.appendChild(overlay)
}

/**
 * Hides the global loading overlay
 */
export function hideGlobalLoading() {
  const overlay = document.getElementById('global-loading')
  if (overlay) {
    overlay.remove()
  }
}
