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
          // Handle specific product by ID
          const id = parseInt(endpoint.split('/')[2]);
          const product = mockProducts.find(p => p.id === id);
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
  getProductById: (id) => mockFetch(`/products/${id}/`),
  getSimilarProducts: (id) => {
    // Return products from same category
    const product = mockProducts.find(p => p.id === parseInt(id));
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
