// Updated: 2024 - Fixed duplicate function issue
/**
 * Displays a toast notification.
 * @param {string} text - The message to display.
 * @param {string} type - The type of toast ('success', 'error', 'info').
 */
export function showToast(text, type = "info") {
  const backgroundColor = {
    success: "#2DC071",
    error: "#E74040",
    info: "#23A6F0",
  }[type]

  window.Toastify({
    text: text,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    style: {
      background: backgroundColor,
    },
  }).showToast()
}

/**
 * Formats a number as a currency string.
 * @param {number} amount - The amount to format.
 * @returns {string} - The formatted currency string (e.g., "$1,234.56").
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

/**
 * Creates a DOM element from an HTML string.
 * @param {string} htmlString - The HTML string to parse.
 * @returns {HTMLElement} The created DOM element.
 */
export function createElementFromHTML(htmlString) {
  const div = document.createElement("div")
  div.innerHTML = htmlString.trim()
  return div.firstChild
}

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 * @param {function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @returns {function} The new debounced function.
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Form validation utilities
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password) {
  return password && password.length >= 6
}

export function validateRequired(value) {
  return value && value.trim().length > 0
}

export function clearFormErrors(form) {
  const errorElements = form.querySelectorAll('.field-error')
  errorElements.forEach(el => el.remove())

  const inputsWithErrors = form.querySelectorAll('.border-red-500')
  inputsWithErrors.forEach(input => {
    input.classList.remove('border-red-500')
    input.classList.add('border-gray-300')
  })
}

export function displayFieldError(input, message) {
  // Remove existing error
  const existingError = input.parentNode.querySelector('.field-error')
  if (existingError) existingError.remove()

  // Add error styling
  input.classList.remove('border-gray-300')
  input.classList.add('border-red-500')

  // Add error message
  const errorDiv = document.createElement('div')
  errorDiv.className = 'field-error text-danger text-sm mt-1'
  errorDiv.textContent = message
  input.parentNode.appendChild(errorDiv)
}

export function clearFieldError(input) {
  const existingError = input.parentNode.querySelector('.field-error')
  if (existingError) existingError.remove()

  input.classList.remove('border-red-500')
  input.classList.add('border-gray-300')
}