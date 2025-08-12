import { createElementFromHTML, showToast, validateRequired, clearFormErrors, displayFieldError, clearFieldError } from "../utils/helpers.js?v=2024"
import { authService } from "../services/api.js"
import store from "../state/store.js"

export default function LoginPage() {
  const page = createElementFromHTML(`
        <div class="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 card">
                <div>
                    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sign in to your account
                    </h2>
                </div>
                <form id="login-form" class="mt-8 space-y-6">
                    <div class="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label for="username" class="sr-only">Username</label>
                            <input id="username" name="username" type="text" required class="input-field rounded-t-md" placeholder="Username">
                        </div>
                        <div>
                            <label for="password" class="sr-only">Password</label>
                            <input id="password" name="password" type="password" required class="input-field rounded-b-md" placeholder="Password">
                        </div>
                    </div>
                    <div>
                        <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
                            Sign in
                        </button>
                    </div>
                </form>
                <p class="text-center text-sm">
                    Don't have an account? <a href="#/register" class="font-medium text-secondary hover:text-blue-600">Register here</a>
                </p>
            </div>
        </div>
    `)

  const form = page.querySelector("#login-form")
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Clear previous errors
    clearFormErrors(form)

    const formData = new FormData(form)
    const username = formData.get("username")
    const password = formData.get("password")

    // Client-side validation
    let hasErrors = false

    if (!validateRequired(username)) {
      displayFieldError(form.querySelector('[name="username"]'), 'Username is required')
      hasErrors = true
    }

    if (!validateRequired(password)) {
      displayFieldError(form.querySelector('[name="password"]'), 'Password is required')
      hasErrors = true
    }

    if (hasErrors) return

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Signing In...'
    submitBtn.disabled = true

    try {
      const response = await authService.login(username, password)

      if (response.tokens) {
        // Update store with authentication data
        store.setState({
          isAuthenticated: true,
          token: response.tokens.access,
          user: response.user,
        })

        showToast("Welcome back! Login successful.", "success")

        // Redirect based on user role
        if (response.user.role === 'store_owner') {
          location.hash = "/dashboard"
        } else {
          location.hash = "/"
        }
      } else {
        throw new Error('Invalid login response')
      }
    } catch (error) {
      console.error('Login error:', error)
      showToast(error.message || 'Login failed. Please try again.', 'error')
    } finally {
      // Reset button state
      submitBtn.innerHTML = originalText
      submitBtn.disabled = false
    }
  })

  // Real-time validation
  const inputs = form.querySelectorAll('input')
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      clearFieldError(input)
    })
  })

  return page
}
