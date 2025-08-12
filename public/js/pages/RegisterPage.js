import { createElementFromHTML, showToast, validateEmail, validatePassword, validateRequired, clearFormErrors, displayFieldError, clearFieldError } from "../utils/helpers.js?v=2024"
import { authService } from "../services/api.js"
import store from "../state/store.js"

export default function RegisterPage() {
  const page = createElementFromHTML(`
        <div class="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 card">
                <div>
                    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p class="mt-2 text-center text-sm text-muted">
                        Join Best in Click and start shopping
                    </p>
                </div>
                <form id="register-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
                        <div>
                            <label for="first_name" class="block text-sm font-medium text-gray-700">First Name</label>
                            <input id="first_name" name="first_name" type="text" required class="input-field" placeholder="Enter your first name">
                        </div>
                        <div>
                            <label for="last_name" class="block text-sm font-medium text-gray-700">Last Name</label>
                            <input id="last_name" name="last_name" type="text" required class="input-field" placeholder="Enter your last name">
                        </div>
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
                            <input id="username" name="username" type="text" required class="input-field" placeholder="Choose a username">
                        </div>
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700">Email Address</label>
                            <input id="email" name="email" type="email" required class="input-field" placeholder="Enter your email">
                        </div>
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
                            <input id="password" name="password" type="password" required class="input-field" placeholder="Create a password">
                        </div>
                        <div>
                            <label for="password_confirm" class="block text-sm font-medium text-gray-700">Confirm Password</label>
                            <input id="password_confirm" name="password_confirm" type="password" required class="input-field" placeholder="Confirm your password">
                        </div>
                        <div>
                            <label for="phone_number" class="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
                            <input id="phone_number" name="phone_number" type="tel" class="input-field" placeholder="Enter your phone number">
                        </div>
                        <div>
                            <label for="role" class="block text-sm font-medium text-gray-700">Account Type</label>
                            <select id="role" name="role" class="input-field">
                                <option value="customer">Customer</option>
                                <option value="store_owner">Store Owner</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
                            Create Account
                        </button>
                    </div>
                </form>
                <p class="text-center text-sm">
                    Already have an account? <a href="#/login" class="font-medium text-secondary hover:text-blue-600">Sign in here</a>
                </p>
            </div>
        </div>
    `)

  const form = page.querySelector("#register-form")
  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Clear previous errors
    clearFormErrors(form)

    const formData = new FormData(form)

    const userData = {
      first_name: formData.get("first_name"),
      last_name: formData.get("last_name"),
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
      password_confirm: formData.get("password_confirm"),
      phone_number: formData.get("phone_number"),
      role: formData.get("role") || "customer"
    }

    // Client-side validation
    let hasErrors = false

    if (!validateRequired(userData.first_name)) {
      displayFieldError(form.querySelector('[name="first_name"]'), 'First name is required')
      hasErrors = true
    }

    if (!validateRequired(userData.last_name)) {
      displayFieldError(form.querySelector('[name="last_name"]'), 'Last name is required')
      hasErrors = true
    }

    if (!validateRequired(userData.username)) {
      displayFieldError(form.querySelector('[name="username"]'), 'Username is required')
      hasErrors = true
    }

    if (!validateRequired(userData.email)) {
      displayFieldError(form.querySelector('[name="email"]'), 'Email is required')
      hasErrors = true
    } else if (!validateEmail(userData.email)) {
      displayFieldError(form.querySelector('[name="email"]'), 'Please enter a valid email address')
      hasErrors = true
    }

    if (!validatePassword(userData.password)) {
      displayFieldError(form.querySelector('[name="password"]'), 'Password must be at least 6 characters long')
      hasErrors = true
    }

    // Validate password confirmation
    const passwordConfirm = formData.get("password_confirm")
    if (userData.password !== passwordConfirm) {
      displayFieldError(form.querySelector('[name="password_confirm"]'), 'Passwords do not match')
      hasErrors = true
    }

    if (hasErrors) return

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Creating Account...'
    submitBtn.disabled = true

    try {
      console.log('Sending registration data:', userData)
      const response = await authService.register(userData)
      console.log('Registration response:', response)

      if (response.tokens) {
        // Auto-login after registration
        store.setState({
          isAuthenticated: true,
          token: response.tokens.access,
          user: response.user,
        })

        showToast("Registration successful! Welcome to Best in Click!", "success")

        // Redirect based on user role
        if (response.user.role === 'store_owner') {
          location.hash = "/dashboard"
        } else {
          location.hash = "/"
        }
      } else {
        // Registration successful but requires login
        showToast("Registration successful! Please log in.", "success")
        location.hash = "/login"
      }
    } catch (error) {
      console.error('Registration error:', error)
      showToast(error.message || 'Registration failed. Please try again.', 'error')
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
