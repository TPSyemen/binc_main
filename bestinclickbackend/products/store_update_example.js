/**
 * Store Update API Usage Examples
 * Frontend JavaScript implementation
 */

class StoreAPI {
    constructor(baseURL, token) {
        this.baseURL = baseURL;
        this.token = token;
        this.headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get current user's store information
     */
    async getMyStore() {
        try {
            const response = await fetch(`${this.baseURL}/api/products/stores/my-store/`, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching store:', error);
            throw error;
        }
    }

    /**
     * Update store information
     */
    async updateStore(slug, storeData) {
        try {
            const response = await fetch(`${this.baseURL}/api/products/stores/${slug}/update/`, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify(storeData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating store:', error);
            throw error;
        }
    }

    /**
     * Upload store logo
     */
    async uploadStoreLogo(slug, logoFile) {
        try {
            const formData = new FormData();
            formData.append('logo', logoFile);

            const response = await fetch(`${this.baseURL}/api/products/stores/${slug}/update/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                    // Don't set Content-Type for FormData
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error uploading logo:', error);
            throw error;
        }
    }
}

// Usage Examples

// Initialize API client
const storeAPI = new StoreAPI('http://localhost:8000', 'your-jwt-token-here');

// Example 1: Get store information
async function loadStoreInfo() {
    try {
        const store = await storeAPI.getMyStore();
        console.log('Store info:', store);
        
        // Update UI with store information
        document.getElementById('store-name').value = store.name;
        document.getElementById('store-email').value = store.email;
        document.getElementById('store-phone').value = store.phone;
        document.getElementById('store-address').value = store.address;
        document.getElementById('store-description').value = store.description;
        
    } catch (error) {
        console.error('Failed to load store info:', error);
        alert('فشل في تحميل معلومات المتجر');
    }
}

// Example 2: Update store information
async function updateStoreInfo() {
    try {
        const storeData = {
            name: document.getElementById('store-name').value,
            email: document.getElementById('store-email').value,
            phone: document.getElementById('store-phone').value,
            address: document.getElementById('store-address').value,
            description: document.getElementById('store-description').value
        };

        // Get current store slug (you might store this when loading store info)
        const currentStore = await storeAPI.getMyStore();
        const updatedStore = await storeAPI.updateStore(currentStore.slug, storeData);
        
        console.log('Store updated:', updatedStore);
        alert('تم تحديث معلومات المتجر بنجاح');
        
    } catch (error) {
        console.error('Failed to update store:', error);
        
        // Handle validation errors
        if (error.message.includes('{')) {
            const errors = JSON.parse(error.message);
            let errorMessage = 'أخطاء في البيانات:\n';
            
            for (const [field, messages] of Object.entries(errors)) {
                errorMessage += `${field}: ${messages.join(', ')}\n`;
            }
            
            alert(errorMessage);
        } else {
            alert('فشل في تحديث معلومات المتجر');
        }
    }
}

// Example 3: Handle logo upload
async function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('يرجى اختيار ملف صورة صحيح');
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت');
        return;
    }

    try {
        // Show loading indicator
        document.getElementById('logo-loading').style.display = 'block';
        
        const currentStore = await storeAPI.getMyStore();
        const result = await storeAPI.uploadStoreLogo(currentStore.slug, file);
        
        console.log('Logo uploaded:', result);
        
        // Update logo preview
        document.getElementById('logo-preview').src = result.logo;
        alert('تم رفع الشعار بنجاح');
        
    } catch (error) {
        console.error('Failed to upload logo:', error);
        alert('فشل في رفع الشعار');
    } finally {
        // Hide loading indicator
        document.getElementById('logo-loading').style.display = 'none';
    }
}

// Example 4: Form validation
function validateStoreForm() {
    const name = document.getElementById('store-name').value.trim();
    const email = document.getElementById('store-email').value.trim();
    const phone = document.getElementById('store-phone').value.trim();
    const address = document.getElementById('store-address').value.trim();

    const errors = [];

    if (!name) {
        errors.push('اسم المتجر مطلوب');
    }

    if (!email) {
        errors.push('البريد الإلكتروني مطلوب');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('البريد الإلكتروني غير صحيح');
    }

    if (!phone) {
        errors.push('رقم الهاتف مطلوب');
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-]/g, ''))) {
        errors.push('رقم الهاتف غير صحيح');
    }

    if (!address) {
        errors.push('العنوان مطلوب');
    }

    if (errors.length > 0) {
        alert('أخطاء في البيانات:\n' + errors.join('\n'));
        return false;
    }

    return true;
}

// Example 5: Complete form handler
async function handleStoreUpdateForm(event) {
    event.preventDefault();

    if (!validateStoreForm()) {
        return;
    }

    // Show loading state
    const submitButton = document.getElementById('submit-button');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'جاري الحفظ...';
    submitButton.disabled = true;

    try {
        await updateStoreInfo();
        
        // Optionally reload store info to get updated data
        await loadStoreInfo();
        
    } catch (error) {
        // Error handling is done in updateStoreInfo
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load store information when page loads
    loadStoreInfo();
    
    // Attach event listeners
    document.getElementById('store-form').addEventListener('submit', handleStoreUpdateForm);
    document.getElementById('logo-input').addEventListener('change', handleLogoUpload);
});