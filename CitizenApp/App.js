// State management using a simple pub/sub pattern
const AppState = {
  currentUser: null,
  incidents: [],
  subscribers: [],

  setState(newState) {
    Object.assign(this, newState);
    this.notifySubscribers();
  },

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  },

  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this));
  }
};

// API endpoints configuration
const API_CONFIG = {
  BASE_URL: 'https://api.citizenwatch.com/v1', // Replace with your actual API endpoint
  ENDPOINTS: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
    INCIDENTS: '/incidents',
    USER_PROFILE: '/users/profile'
  }
};

// Enhanced authentication functions with proper session management
class AuthService {
  static async login(email, password) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken() // Security measure
        },
        credentials: 'include', // Important for cookie handling
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      
      // Store tokens securely
      this.setSession(data);
      
      // Update application state
      AppState.setState({ currentUser: data.user });
      
      return data.user;
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  }

  static async register(email, password, name) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      this.setSession(data);
      AppState.setState({ currentUser: data.user });
      
      return data.user;
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  }

  static async logout() {
    try {
      await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'X-CSRF-Token': this.getCSRFToken()
        },
        credentials: 'include'
      });

      this.clearSession();
      AppState.setState({ currentUser: null });
      updateAuthUI();
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  }

  // Session management
  static setSession(authData) {
    localStorage.setItem('accessToken', authData.accessToken);
    // Store refresh token in HTTP-only cookie (handled by server)
  }

  static clearSession() {
    localStorage.removeItem('accessToken');
    // Clear cookies
    document.cookie.split(";").forEach(cookie => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
  }

  static getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  static getCSRFToken() {
    return document.querySelector('meta[name="csrf-token"]')?.content;
  }

  // Token refresh mechanism
  static async refreshToken() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': this.getCSRFToken()
        }
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setSession(data);
      return data.accessToken;
    } catch (error) {
      this.clearSession();
      AppState.setState({ currentUser: null });
      throw error;
    }
  }
}

// Enhanced error handling
class ErrorHandler {
  static ERROR_TYPES = {
    AUTH: 'authentication_error',
    NETWORK: 'network_error',
    VALIDATION: 'validation_error',
    SERVER: 'server_error',
    UNKNOWN: 'unknown_error'
  };

  static handle(error) {
    console.error('Error:', error);

    // Determine error type
    const errorType = this.getErrorType(error);

    // Handle based on error type
    switch (errorType) {
      case this.ERROR_TYPES.AUTH:
        this.handleAuthError(error);
        break;
      case this.ERROR_TYPES.NETWORK:
        this.handleNetworkError(error);
        break;
      case this.ERROR_TYPES.VALIDATION:
        this.handleValidationError(error);
        break;
      case this.ERROR_TYPES.SERVER:
        this.handleServerError(error);
        break;
      default:
        this.handleUnknownError(error);
    }

    // Show user-friendly error message
    this.showErrorMessage(error);
  }

  static getErrorType(error) {
    if (error.name === 'AuthenticationError') return this.ERROR_TYPES.AUTH;
    if (error instanceof TypeError) return this.ERROR_TYPES.NETWORK;
    if (error.name === 'ValidationError') return this.ERROR_TYPES.VALIDATION;
    if (error.status >= 500) return this.ERROR_TYPES.SERVER;
    return this.ERROR_TYPES.UNKNOWN;
  }

  static handleAuthError(error) {
    if (error.message.includes('token expired')) {
      AuthService.refreshToken().catch(() => {
        AuthService.clearSession();
        window.location.href = '/login';
      });
    }
  }

  static handleNetworkError(error) {
    // Implement offline support or retry mechanism
    console.log('Network error:', error);
  }

  static handleValidationError(error) {
    // Show validation errors in the UI
    const errors = error.errors || {};
    Object.entries(errors).forEach(([field, message]) => {
      showError(field, message);
    });
  }

  static handleServerError(error) {
    // Log to monitoring service
    console.error('Server error:', error);
  }

  static handleUnknownError(error) {
    console.error('Unknown error:', error);
  }

  static showErrorMessage(error) {
    // Show toast notification or error message
    const message = this.getUserFriendlyMessage(error);
    // Implement your UI notification system here
    console.log('Error message:', message);
  }

  static getUserFriendlyMessage(error) {
    // Map error types to user-friendly messages
    const messages = {
      [this.ERROR_TYPES.AUTH]: 'Please log in again to continue.',
      [this.ERROR_TYPES.NETWORK]: 'Please check your internet connection.',
      [this.ERROR_TYPES.VALIDATION]: 'Please check the form for errors.',
      [this.ERROR_TYPES.SERVER]: 'Something went wrong. Please try again later.',
      [this.ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred.'
    };

    return messages[this.getErrorType(error)] || error.message;
  }
}

// API integration for data persistence
class IncidentService {
  static async getIncidents() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INCIDENTS}`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getAccessToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch incidents');

      const incidents = await response.json();
      AppState.setState({ incidents });
      return incidents;
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  }

  static async createIncident(incidentData) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INCIDENTS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getAccessToken()}`
        },
        body: JSON.stringify(incidentData)
      });

      if (!response.ok) throw new Error('Failed to create incident');

      const newIncident = await response.json();
      AppState.setState({ 
        incidents: [newIncident, ...AppState.incidents] 
      });
      return newIncident;
    } catch (error) {
      ErrorHandler.handle(error);
      throw error;
    }
  }
}

// User authentication state
let currentUser = null;

// Authentication functions
function login(email, password) {
  // TODO: Implement actual authentication
  return new Promise((resolve, reject) => {
    if (email && password) {
      currentUser = {
        id: 1,
        email: email,
        name: "Test User",
        role: "citizen"
      };
      resolve(currentUser);
    } else {
      reject(new Error("Invalid credentials"));
    }
  });
}

function logout() {
  currentUser = null;
  // Update UI to reflect logged out state
  updateAuthUI();
}

function register(email, password, name) {
  // TODO: Implement actual registration
  return new Promise((resolve, reject) => {
    if (email && password && name) {
      currentUser = {
        id: 1,
        email: email,
        name: name,
        role: "citizen"
      };
      resolve(currentUser);
    } else {
      reject(new Error("Invalid registration data"));
    }
  });
}

// UI update functions
function updateAuthUI() {
  const authButtons = document.querySelector('.btn-auth')?.parentElement;
  if (authButtons) {
    if (currentUser) {
      authButtons.innerHTML = `
        <div class="flex items-center gap-4">
          <span class="text-sm">Welcome, ${currentUser.name}</span>
          <button class="btn btn-outline" onclick="logout()">Logout</button>
        </div>
      `;
    } else {
      authButtons.innerHTML = `
        <button class="btn btn-auth login-btn" id="login-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          Login
        </button>
        <button class="btn btn-auth register-btn" id="register-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="16" y1="11" x2="22" y2="11"/>
          </svg>
          Register
        </button>
      `;
    }
  }
}

// Geolocation handling
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
}

// Form validation
function validateForm(formData) {
  const errors = {};
  
  if (!formData.type) errors.type = 'Incident type is required';
  if (!formData.title) errors.title = 'Title is required';
  if (!formData.description) errors.description = 'Description is required';
  if (!formData.location) errors.location = 'Location is required';
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Error handling
function showError(elementId, message) {
  const errorElement = document.querySelector(`#${elementId} + .error-message`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

function clearErrors() {
  document.querySelectorAll('.error-message').forEach(element => {
    element.textContent = '';
    element.style.display = 'none';
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize auth UI
  updateAuthUI();

  // Get location button handler
  const getLocationBtn = document.getElementById('get-location');
  if (getLocationBtn) {
    getLocationBtn.addEventListener('click', async () => {
      try {
        const location = await getCurrentLocation();
        document.getElementById('latitude').value = location.latitude;
        document.getElementById('longitude').value = location.longitude;
        document.getElementById('incident-location').value = 'Location detected';
      } catch (error) {
        showError('incident-location', error.message);
      }
    });
  }

  // Form validation
  const reportForm = document.getElementById('report-form');
  if (reportForm) {
    reportForm.addEventListener('input', (e) => {
      const input = e.target;
      const errorElement = input.nextElementSibling;
      if (input.validity.valid) {
        input.classList.remove('invalid');
        if (errorElement?.classList.contains('error-message')) {
          errorElement.textContent = '';
          errorElement.style.display = 'none';
        }
      }
    });
  }

  // Mobile menu button handler
  const menuButton = document.querySelector('button[aria-label="Menu"]');
  if (menuButton) {
    menuButton.addEventListener('click', () => {
      // TODO: Implement mobile menu toggle
      console.log('Menu clicked');
    });
  }

  // Subscribe to state changes
  AppState.subscribe((state) => {
    updateAuthUI();
    if (state.incidents.length > 0) {
      renderIncidents(state.incidents);
    }
  });

  // Initialize data
  IncidentService.getIncidents().catch(ErrorHandler.handle);
});

// Export functions for use in other files
window.app = {
  auth: AuthService,
  incidents: IncidentService,
  state: AppState,
  errors: ErrorHandler
};
