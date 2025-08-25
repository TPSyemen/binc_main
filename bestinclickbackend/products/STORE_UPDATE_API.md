# Store Update API Documentation

## Overview
This API allows store owners to view and update their store information.

## Endpoints

### 1. Get My Store Information
**GET** `/api/products/stores/my-store/`

**Authentication:** Required (Store Owner only)

**Response:**
```json
{
    "id": 1,
    "name": "My Store",
    "slug": "my-store-owner123",
    "description": "Store description",
    "email": "store@example.com",
    "phone": "+1234567890",
    "address": "123 Store Street",
    "average_rating": 4.5,
    "total_orders_count": 100,
    "customer_service_score": 4.2,
    "is_active": true,
    "is_verified": true,
    "logo": "/media/stores/logos/logo.jpg",
    "banner": "/media/stores/banners/banner.jpg",
    "owner_name": "Store Owner",
    "product_count": 25
}
```

### 2. Update Store Information
**PUT/PATCH** `/api/products/stores/{slug}/update/`

**Authentication:** Required (Store Owner only - own store)

**Request Body:**
```json
{
    "name": "Updated Store Name",
    "description": "Updated store description",
    "email": "updated@example.com",
    "phone": "+9876543210",
    "address": "456 Updated Street",
    "logo": "base64_image_or_file",
    "banner": "base64_image_or_file"
}
```

**Response:**
```json
{
    "name": "Updated Store Name",
    "description": "Updated store description",
    "email": "updated@example.com",
    "phone": "+9876543210",
    "address": "456 Updated Street",
    "logo": "/media/stores/logos/new_logo.jpg",
    "banner": "/media/stores/banners/new_banner.jpg"
}
```

### 3. Get Store Information (Read-only)
**GET** `/api/products/stores/{slug}/update/`

**Authentication:** Required (Store Owner only - own store)

**Response:** Same as PUT/PATCH response but with all store fields

## Validation Rules

### Name
- Required field
- Cannot be empty
- Must be unique across all stores

### Email
- Required field
- Must be valid email format
- Must be unique across all stores

### Phone
- Required field
- Must be valid phone number format
- Accepts international format (+1234567890)

### Address
- Required field
- Cannot be empty

## Error Responses

### 400 Bad Request
```json
{
    "name": ["اسم المتجر مطلوب"],
    "email": ["يوجد متجر آخر بنفس البريد الإلكتروني"],
    "phone": ["رقم الهاتف غير صحيح"]
}
```

### 401 Unauthorized
```json
{
    "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
    "error": "يجب أن تكون مالك متجر للوصول لهذه الخاصية"
}
```

### 404 Not Found
```json
{
    "detail": "Not found."
}
```

## Usage Examples

### JavaScript/Fetch
```javascript
// Get my store information
const getMyStore = async () => {
    const response = await fetch('/api/products/stores/my-store/', {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });
    return await response.json();
};

// Update store information
const updateStore = async (slug, storeData) => {
    const response = await fetch(`/api/products/stores/${slug}/update/`, {
        method: 'PATCH',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeData)
    });
    return await response.json();
};
```

### Python/Requests
```python
import requests

# Get my store information
def get_my_store(token):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.get('/api/products/stores/my-store/', headers=headers)
    return response.json()

# Update store information
def update_store(token, slug, store_data):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    response = requests.patch(
        f'/api/products/stores/{slug}/update/',
        headers=headers,
        json=store_data
    )
    return response.json()
```

## Security Features

1. **Authentication Required:** Only authenticated users can access these endpoints
2. **Role-based Access:** Only store owners can update store information
3. **Ownership Validation:** Store owners can only update their own stores
4. **Data Validation:** All input data is validated before saving
5. **Unique Constraints:** Email and name uniqueness is enforced
6. **Slug Regeneration:** Store slug is automatically updated when name changes

## Notes

- When updating the store name, the slug will be automatically regenerated
- Image uploads (logo/banner) support both file uploads and base64 encoded images
- All fields in the update request are optional (PATCH method)
- The API supports both PUT (full update) and PATCH (partial update) methods