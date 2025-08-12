/**
 * A simple centralized state management object (store).
 * It holds the application's global state and notifies observers of changes.
 */
const store = {
  state: {
    isAuthenticated: false,
    user: null, // { username, email, role, etc. }
    token: null,
    cart: [],
  },
  observers: [],

  /**
   * Initializes the state from localStorage.
   * This allows the user's session to persist across page reloads.
   */
  initState() {
    // Check for new token structure first
    const accessToken = localStorage.getItem("access_token")
    const refreshToken = localStorage.getItem("refresh_token")
    const user = localStorage.getItem("user")

    if (accessToken && user) {
      this.state.isAuthenticated = true
      this.state.token = accessToken
      this.state.user = JSON.parse(user)
    } else {
      // Fallback to old token structure for backward compatibility
      const oldToken = localStorage.getItem("token")
      if (oldToken && user) {
        this.state.isAuthenticated = true
        this.state.token = oldToken
        this.state.user = JSON.parse(user)
      }
    }
    this.notifyObservers()
  },

  /**
   * Returns the current state.
   * @returns {object} The current state object.
   */
  getState() {
    return this.state
  },

  /**
   * Updates the state with new values and notifies observers.
   * @param {object} newState - An object with the new state values.
   */
  setState(newState) {
    this.state = { ...this.state, ...newState }

    // Persist auth state to localStorage
    if (newState.token !== undefined) {
      // Store as access_token for new structure
      if (newState.token) {
        localStorage.setItem("access_token", newState.token)
        // Keep old token for backward compatibility
        localStorage.setItem("token", newState.token)
      } else {
        localStorage.removeItem("access_token")
        localStorage.removeItem("token")
      }
    }
    if (newState.user !== undefined) {
      if (newState.user) {
        localStorage.setItem("user", JSON.stringify(newState.user))
      } else {
        localStorage.removeItem("user")
      }
    }
    if (newState.isAuthenticated === false) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    }

    this.notifyObservers()
  },

  /**
   * Adds an observer function to be called on state changes.
   * @param {function} observer - The function to be called.
   */
  addObserver(observer) {
    this.observers.push(observer)
  },

  /**
   * Calls all registered observer functions.
   */
  notifyObservers() {
    this.observers.forEach((observer) => observer(this.state))
  },
}

export default store
