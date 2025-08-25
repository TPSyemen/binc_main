import { createElementFromHTML, showToast } from "../utils/helpers.js?v=2024"
import store from "../state/store.js"
import { dashboardService, productService } from "../services/api.js"

/**
 * Edit Store Information Page
 */
export default function EditStorePage() {
  const { user } = store.getState()
  
  if (!user || user.role !== 'store_owner') {
    return createElementFromHTML(
      `<div class="container mx-auto py-8 px-4"> 
        <div class="text-center">
          <h1 class="text-2xl font-bold text-danger mb-4">Access Denied</h1>
          <p class="text-muted">You must be a store owner to access this page.</p>
        </div>
      </div>`
    )
  }

  const page = createElementFromHTML(
    `<div class="container mx-auto py-8 px-4 max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-extrabold mb-2">Edit Store Information</h1>
            <p class="text-muted">Update your store's details to enhance customer experience</p>
          </div>
          <button id="back-btn" class="btn btn-outline">
            <i class="fa-solid fa-arrow-left mr-2"></i> 
            Back to Dashboard
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div id="loading-state" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
        <p class="mt-2 text-muted">Loading store information...</p>
      </div>

        <!-- Edit Form -->
        <form id="edit-store-form" class="card"> 
          <h2 class="text-2xl font-bold mb-6">Edit Information</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Store Name -->
            <div class="form-group">
              <label class="block mb-2 font-semibold">Store Name *</label>
              <input type="text" id="store-name" name="name" class="input input-bordered w-full" required />
              <div class="error-message text-danger text-sm mt-1 hidden" id="name-error"></div>
            </div>

            <!-- Email -->
            <div class="form-group">
              <label class="block mb-2 font-semibold">Email *</label>
              <input type="email" id="store-email" name="email" class="input input-bordered w-full" required />
              <div class="error-message text-danger text-sm mt-1 hidden" id="email-error"></div>
            </div>

            <!-- Phone -->
            <div class="form-group">
              <label class="block mb-2 font-semibold">Phone Number *</label>
              <input type="tel" id="store-phone" name="phone" class="input input-bordered w-full" required placeholder="+966501234567" />
              <div class="error-message text-danger text-sm mt-1 hidden" id="phone-error"></div>
            </div>

            <!-- Address -->
            <div class="form-group">
              <label class="block mb-2 font-semibold">Address *</label>
              <input type="text" id="store-address" name="address" class="input input-bordered w-full" required />
              <div class="error-message text-danger text-sm mt-1 hidden" id="address-error"></div>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group mt-6">
            <label class="block mb-2 font-semibold">Store Description</label>
            <textarea id="store-description" name="description" class="textarea textarea-bordered w-full h-24" placeholder="Write a brief description about your store..."></textarea>
            <div class="error-message text-danger text-sm mt-1 hidden" id="description-error"></div>
          </div>

          <!-- Submit Buttons -->
          <div class="flex gap-4 mt-8">
            <button type="submit" id="save-btn" class="btn btn-primary flex-1">
              <i class="fa-solid fa-save mr-2"></i> 
              Save Changes
            </button>
            <button type="button" id="cancel-btn" class="btn btn-outline">
              <i class="fa-solid fa-times mr-2"></i> 
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  `)

  // Initialize page
  initializeEditStorePage(page)

  return page
}

/**
 * Initialize the edit store page
 */
async function initializeEditStorePage(page) {
  try {
    // Load store data
    await loadStoreData(page)
    
    // Setup event listeners
    setupEventListeners(page)
    
    // Show form
    page.querySelector('#loading-state').classList.add('hidden')
    page.querySelector('#edit-form-container').classList.remove('hidden')
    
  } catch (error) {
    console.error('Error initializing edit store page:', error)
    showErrorState(page, error)
  }
}

/**
 * Load store data from API
 */
async function loadStoreData(page) {
  try {
    const storeData = await dashboardService.getMyStore()
    
    if (!storeData || !storeData.id) {
      throw new Error('Store information not found')
    }
    
    // Fill form with current data
    page.querySelector('#store-name').value = storeData.name || ''
    page.querySelector('#store-email').value = storeData.email || ''
    page.querySelector('#store-phone').value = storeData.phone || ''
    page.querySelector('#store-address').value = storeData.address || ''
    page.querySelector('#store-description').value = storeData.description || ''
    
    // Update stats
    page.querySelector('#stat-rating').textContent = (storeData.average_rating || 0).toFixed(1)
    page.querySelector('#stat-products').textContent = storeData.product_count || 0
    page.querySelector('#stat-orders').textContent = storeData.total_orders_count || 0
    page.querySelector('#stat-service').textContent = (storeData.customer_service_score || 0).toFixed(1)
    
    // Update status badges
    const verifiedStatus = page.querySelector('#verified-status')
    verifiedStatus.textContent = storeData.is_verified ? 'Verified Store' : 'Pending Verification'
    verifiedStatus.className = `inline-block px-3 py-1 rounded text-sm ${storeData.is_verified ? 'bg-success text-white' : 'bg-warning text-white'}`
    
    const activeStatus = page.querySelector('#active-status')
    activeStatus.textContent = storeData.is_active ? 'Active' : 'Inactive'
    activeStatus.className = `inline-block px-3 py-1 rounded text-sm ${storeData.is_active ? 'bg-success text-white' : 'bg-danger text-white'}` 
    
    // Load images if they exist
    if (storeData.logo) {
      showImagePreview(page, 'logo', storeData.logo)
    }
    
    if (storeData.banner) {
      showImagePreview(page, 'banner', storeData.banner)
    }
    
    // Store the current store data for later use
    page.storeData = storeData
    
  } catch (error) {
    console.error('Error loading store data:', error)
    throw error
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners(page) {
  // Back button
  page.querySelector('#back-btn').addEventListener('click', () => {
    location.hash = '#/dashboard'
  })
  
  // Cancel button
  page.querySelector('#cancel-btn').addEventListener('click', () => {
    location.hash = '#/dashboard'
  })
  
  // Retry button
  page.querySelector('#retry-btn').addEventListener('click', () => {
    location.reload()
  })
  
  // Form submission
  page.querySelector('#edit-store-form').addEventListener('submit', handleFormSubmit)
  
  // Image upload areas
  setupImageUpload(page, 'logo')
  setupImageUpload(page, 'banner')
  
  // Remove image buttons
  page.querySelector('#remove-logo').addEventListener('click', () => {
    removeImage(page, 'logo')
  })
  
  page.querySelector('#remove-banner').addEventListener('click', () => {
    removeImage(page, 'banner')
  })
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
  event.preventDefault()
  
  const page = event.target.closest('.container')
  const saveBtn = page.querySelector('#save-btn')
  const originalText = saveBtn.innerHTML
  
  try {
    // Clear previous errors
    clearErrors(page)
    
    // Show loading state
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>جاري الحفظ...'
    saveBtn.disabled = true
    
    // Collect form data
    const formData = {
      name: page.querySelector('#store-name').value.trim(),
      email: page.querySelector('#store-email').value.trim(),
      phone: page.querySelector('#store-phone').value.trim(),
      address: page.querySelector('#store-address').value.trim(),
      description: page.querySelector('#store-description').value.trim()
    }
    
    // Validate form data
    if (!validateFormData(page, formData)) {
      return
    }
    
    // Update store via API
    const storeSlug = page.storeData.slug
    const updatedStore = await productService.updateStore(storeSlug, formData)
    
    // Show success message
    showToast('Store information updated successfully', 'success')
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      location.hash = '#/dashboard'
    }, 1500)

  } catch (error) {
    console.error('Error updating store:', error)
    showToast('حدث خطأ في تحديث معلومات المتجر', 'error')
  } finally {
    // Reset button state
    saveBtn.innerHTML = originalText
    saveBtn.disabled = false
  }
}

/**
 * Validate form data
 */
function validateFormData(page, data) {
  let isValid = true
  
  // Name validation
  if (!data.name) { 
    showFieldError(page, 'name', 'Store name is required')
    isValid = false
  }
  
  // Email validation
  if (!data.email) {
    showFieldError(page, 'email', 'Email is required')
    isValid = false
  } else if (!/^[^@]+@[^@]+\.[^@]+$/.test(data.email)) {
    showFieldError(page, 'email', 'Invalid email format')
    isValid = false
  } 
  // Phone validation
  if (!data.phone) {
    showFieldError(page, 'phone', 'رقم الهاتف مطلوب')
 isValid = false
  } else if (!/^[+]?[1-9][0-9]{0,15}$/.test(data.phone.replace(/[-()\s]/g, ''))) {
    showFieldError(page, 'phone', 'رقم الهاتف غير صحيح')
 isValid = false
  }
  
  // Address validation
  if (!data.address) {
    showFieldError(page, 'address', 'Address is required')
    isValid = false
  }
  
  return isValid
}

/**
 * Handle API errors
 */
function handleApiErrors(page, errorData) {
  if (typeof errorData === 'object') {
    for (const [field, messages] of Object.entries(errorData)) {
      if (Array.isArray(messages)) {
        showFieldError(page, field, messages[0])
      } else {
        showFieldError(page, field, messages)
      }
    }
  } else {
    showToast('حدث خطأ في تحديث البيانات', 'error')
  }
}

/**
 * Show field error
 */
function showFieldError(page, fieldName, message) {
  const errorElement = page.querySelector(`#${fieldName}-error`)
  if (errorElement) {
    errorElement.textContent = message
    errorElement.classList.remove('hidden')
  }
  
  const inputElement = page.querySelector(`#store-${fieldName}`)
  if (inputElement) {
    inputElement.classList.add('border-danger')
  }
}

/**
 * Clear all errors
 */
function clearErrors(page) {
  const errorElements = page.querySelectorAll('.error-message')
  errorElements.forEach(element => {
    element.classList.add('hidden')
    element.textContent = ''
  })
  
  const inputElements = page.querySelectorAll('.input, .textarea')
  inputElements.forEach(element => {
    element.classList.remove('border-danger')
  })
}

/**
 * Setup image upload functionality
 */
function setupImageUpload(page, type) {
  const uploadArea = page.querySelector(`#${type}-upload-area`)
  const input = page.querySelector(`#${type}-input`)
  
  uploadArea.addEventListener('click', () => {
    input.click()
  })
  
  input.addEventListener('change', (event) => {
    handleImageUpload(page, type, event.target.files[0])
  })
}

/**
 * Handle image upload
 */
async function handleImageUpload(page, type, file) {
  if (!file) return
  
  // Validate file
  if (!file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error')
    return
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size is too large. Maximum 5MB', 'error')
    return
  }
  
  try {
    // Show loading
    const loadingIndicator = page.querySelector(`#${type}-upload-area`).parentElement.querySelector('.loading-indicator')
    loadingIndicator.classList.remove('hidden')
    
    // Create form data
    const formData = new FormData()
    formData.append(type, file)
    
    // Upload image
    const storeSlug = page.storeData.slug
    const result = await productService.updateStore(storeSlug, formData)
    
    // Show preview
    showImagePreview(page, type, result[type])
    
    showToast(`Successfully uploaded ${type === 'logo' ? 'logo' : 'banner'}`, 'success')
    
  } catch (error) {
    console.error(`Error uploading ${type}:`, error) 
    showToast(`Failed to upload ${type === 'logo' ? 'logo' : 'banner'}`, 'error')
  } finally {
    // Hide loading
    const loadingIndicator = page.querySelector(`#${type}-upload-area`).parentElement.querySelector('.loading-indicator')
    loadingIndicator.classList.add('hidden')
  }
}

/**
 * Show image preview
 */
function showImagePreview(page, type, imageUrl) {
  const previewContainer = page.querySelector(`#${type}-preview-container`)
  const preview = page.querySelector(`#${type}-preview`)
  const uploadArea = page.querySelector(`#${type}-upload-area`)
  
  preview.src = imageUrl
  previewContainer.classList.remove('hidden')
  uploadArea.classList.add('hidden')
}

/**
 * Remove image
 */
async function removeImage(page, type) {
  try {
    // Here you would typically call an API to remove the image
    // For now, we'll just hide the preview
    const previewContainer = page.querySelector(`#${type}-preview-container`)
    const uploadArea = page.querySelector(`#${type}-upload-area`)
    
    previewContainer.classList.add('hidden')
    uploadArea.classList.remove('hidden')
    
    showToast(`Successfully removed ${type === 'logo' ? 'logo' : 'banner'}`, 'success')
    
  } catch (error) {
    console.error(`Error removing ${type}:`, error) 
    showToast(`Failed to remove ${type === 'logo' ? 'logo' : 'banner'}`, 'error')
  }
}

/**
 * Show error state
 */
function showErrorState(page, error) {
  page.querySelector('#loading-state').classList.add('hidden')
  page.querySelector('#error-state').classList.remove('hidden')
  
  console.error('Edit store page error:', error)
}