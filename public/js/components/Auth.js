/**
 * Authentication Component
 * Handles user authentication with backend integration
 */

import { authService } from '../services/api.js'
import { showToast } from '../utils/helpers.js'
import store from '../state/store.js'

export class Auth {
  constructor() {
    this.isLoading = false
    
    // Bind methods
    this.login = this.login.bind(this)
    this.register = this.register.bind(this)
    this.logout = this.logout.bind(this)
    this.getProfile = this.getProfile.bind(this)
    this.updateProfile = this.updateProfile.bind(this)
    this.changePassword = this.changePassword.bind(this)
    
    // Initialize authentication state
    this.initAuth()
  }

  /**
   * Initialize authentication state
   */
  async initAuth() {
    const accessToken = localStorage.getItem('access_token')
    const user = localStorage.getItem('user')
    
    if (accessToken && user) {
      try {
        // Verify token is still valid by fetching profile
        const profile = await this.getProfile()
        if (profile) {
          store.setState({
            isAuthenticated: true,
            user: profile,
            token: accessToken
          })
        }
      } catch (error) {
        console.error('Token validation failed:', error)
        this.logout()
      }
    }
  }

  /**
   * User login
   */
  async login(username, password) {
    try {
      this.isLoading = true
      
      const response = await authService.login(username, password)
      
      if (response.tokens) {
        // Store tokens
        localStorage.setItem('access_token', response.tokens.access)
        localStorage.setItem('refresh_token', response.tokens.refresh)
        
        // If user is a store owner, fetch store information
        let userWithStore = response.user
        if (response.user.role === 'store_owner') {
          try {
            const { dashboardService } = await import('../services/api.js')
            const storeInfo = await dashboardService.getMyStore()
            if (storeInfo && storeInfo.name) {
              userWithStore = {
                ...response.user,
                store_name: storeInfo.name,
                store_id: storeInfo.id
              }
            }
          } catch (storeError) {
            console.warn('Failed to fetch store information during login:', storeError)
          }
        }
        
        // Update store
        store.setState({
          isAuthenticated: true,
          user: userWithStore,
          token: response.tokens.access
        })
        
        showToast('Login successful!', 'success')
        return { success: true, user: userWithStore }
      }
      
      throw new Error('Invalid response format')
      
    } catch (error) {
      console.error('Login failed:', error)
      showToast(error.message || 'Login failed', 'error')
      return { success: false, error: error.message }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * User registration
   */
  async register(userData) {
    try {
      this.isLoading = true
      
      const response = await authService.register(userData)
      
      if (response.tokens) {
        // Store tokens if auto-login after registration
        localStorage.setItem('access_token', response.tokens.access)
        localStorage.setItem('refresh_token', response.tokens.refresh)
        
        // Update store
        store.setState({
          isAuthenticated: true,
          user: response.user,
          token: response.tokens.access
        })
        
        showToast('Registration successful!', 'success')
        return { success: true, user: response.user }
      } else {
        showToast('Registration successful! Please log in.', 'success')
        return { success: true, requiresLogin: true }
      }
      
    } catch (error) {
      console.error('Registration failed:', error)
      showToast(error.message || 'Registration failed', 'error')
      return { success: false, error: error.message }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * User logout
   */
  async logout() {
    try {
      this.isLoading = true
      
      await authService.logout()
      
      showToast('Logged out successfully', 'success')
      
      // Redirect to home page
      window.location.href = '/'
      
    } catch (error) {
      console.error('Logout error:', error)
      // Even if logout API fails, clear local state
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      store.setState({
        isAuthenticated: false,
        user: null,
        token: null
      })
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Get user profile
   */
  async getProfile() {
    try {
      const response = await authService.getProfile()
      
      // If user is a store owner, fetch store information
      if (response.role === 'store_owner') {
        try {
          const { dashboardService } = await import('../services/api.js')
          const storeInfo = await dashboardService.getMyStore()
          if (storeInfo && storeInfo.name) {
            response.store_name = storeInfo.name
            response.store_id = storeInfo.id
          }
        } catch (storeError) {
          console.warn('Failed to fetch store information:', storeError)
        }
      }
      
      return response
    } catch (error) {
      console.error('Failed to get profile:', error)
      throw error
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userData) {
    try {
      this.isLoading = true
      
      const response = await authService.updateProfile(userData)
      
      // Update store with new user data
      store.setState({ user: response })
      
      showToast('Profile updated successfully', 'success')
      return { success: true, user: response }
      
    } catch (error) {
      console.error('Failed to update profile:', error)
      showToast(error.message || 'Failed to update profile', 'error')
      return { success: false, error: error.message }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Change password
   */
  async changePassword(oldPassword, newPassword) {
    try {
      this.isLoading = true
      
      const response = await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword
      })
      
      showToast('Password changed successfully', 'success')
      return { success: true }
      
    } catch (error) {
      console.error('Failed to change password:', error)
      showToast(error.message || 'Failed to change password', 'error')
      return { success: false, error: error.message }
    } finally {
      this.isLoading = false
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return store.getState().isAuthenticated
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return store.getState().user
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    const user = this.getCurrentUser()
    return user && user.role === role
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.hasRole('admin')
  }

  /**
   * Check if user is store owner
   */
  isStoreOwner() {
    return this.hasRole('store_owner')
  }

  /**
   * Check if user is customer
   */
  isCustomer() {
    return this.hasRole('customer')
  }

  /**
   * Get loading state
   */
  getLoadingState() {
    return this.isLoading
  }
}

// Create global auth instance
window.auth = new Auth()

export default window.auth
