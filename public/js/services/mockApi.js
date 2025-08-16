import { mockProducts, mockUser, mockApiResponses } from './mockData.js';
import { showToast } from '../utils/helpers.js?v=2024';

// Mock API service for testing without backend
const MOCK_DELAY = 500; // Simulate network delay

function mockFetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(`Mock API call: ${endpoint}`, options);
      
      // Handle different endpoints
      if (endpoint === '/auth/login/') {
        const body = JSON.parse(options.body || '{}');
        if (body.username && body.password) {
          resolve(mockApiResponses['/auth/login/']);
        } else {
          reject(new Error('Invalid credentials'));
        }
      } else if (endpoint === '/auth/profile/') {
        resolve(mockApiResponses['/auth/profile/']);
      } else if (endpoint.startsWith('/products/')) {
        if (endpoint === '/products/') {
          resolve(mockApiResponses['/products/']);
        } else {
          // Handle specific product by ID or slug
          const identifier = endpoint.split('/')[2];
          let product = null;
          
          // Try to find by ID first (if it's a number)
          if (!isNaN(identifier)) {
            const id = parseInt(identifier);
            product = mockProducts.find(p => p.id === id);
          }
          
          // If not found by ID, try to find by slug
          if (!product) {
            product = mockProducts.find(p => p.slug === identifier);
          }
          
          if (product) {
            resolve(product);
          } else {
            reject(new Error('Product not found'));
          }
        }
      } else if (endpoint === '/dashboard/stats/') {
        resolve(mockApiResponses['/dashboard/stats/']);
      } else if (endpoint === '/auth/register/') {
        const body = JSON.parse(options.body || '{}');
        if (body.username && body.email && body.password) {
          resolve({ message: 'Registration successful' });
        } else {
          reject(new Error('Missing required fields'));
        }
      } else {
        reject(new Error(`Mock endpoint not implemented: ${endpoint}`));
      }
    }, MOCK_DELAY);
  });
}

// Mock API services
export const mockAuthService = {
  login: (username, password) =>
    mockFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  register: (userData) =>
    mockFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  getProfile: () => mockFetch('/auth/profile/')
};

export const mockProductService = {
  getProducts: (params = '') => mockFetch('/products/'),
  getProductById: (identifier) => mockFetch(`/products/${identifier}/`),
  getSimilarProducts: (identifier) => {
    // Find product by ID or slug
    let product = null;
    if (!isNaN(identifier)) {
      product = mockProducts.find(p => p.id === parseInt(identifier));
    }
    if (!product) {
      product = mockProducts.find(p => p.slug === identifier);
    }
    
    if (product) {
      const similar = mockProducts
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, 4);
      return Promise.resolve({ results: similar });
    }
    return Promise.reject(new Error('Product not found'));
  }
};

export const mockDashboardService = {
  getStats: () => mockFetch('/dashboard/stats/'),
  getOwnerProducts: () => mockFetch('/products/'),
  updateProduct: (id, data) => 
    Promise.resolve({ message: 'Product updated successfully' })
};

export const mockBehaviorService = {
  log: (behaviorData) => 
    Promise.resolve({ message: 'Behavior logged' }),
  getRealtimeRecs: () => 
    Promise.resolve({ results: mockProducts.slice(0, 3) })
};

export const mockReportService = {
  generateReport: (reportType) =>
    Promise.resolve({ id: 'mock-report-123', status: 'processing' }),
  getReportStatus: (id) =>
    Promise.resolve({ id, status: 'completed', download_url: '#' })
};

export const mockRecommendationService = {
  getRecommendations: (params = '') => 
    Promise.resolve({ results: mockProducts.slice(0, 10) }),
  getPersonalizedRecs: () => {
    // Return original mock products without modification - preserve backend structure
    const recommendations = mockProducts.slice(0, 15);
    
    return Promise.resolve({ 
      recommendations,
      message: recommendations.length > 0 ? null : 'No personalized recommendations available at the moment.'
    });
  }
};
