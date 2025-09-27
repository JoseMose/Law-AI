const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const authService = {
  async signUp(username, password, email) {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'same-origin',
      body: JSON.stringify({ username, password, email }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Failed to sign up');
    }
    
    return response.json();
  },

  async signIn(username, password) {
    try {
      // Validate input
      if (!username || !password) {
        throw new Error('Username and password are required');
      }

      // Check API URL
      if (!API_URL) {
        throw new Error('API URL is not configured');
      }

      console.log('Attempting to sign in to:', API_URL);

      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin', // Changed from 'include' to 'same-origin'
        body: JSON.stringify({ username, password }),
      }).catch(error => {
        console.error('Network error:', error);
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }
      
      if (!data.accessToken || !data.idToken) {
        throw new Error('Invalid response from server');
      }

      // Store tokens in session storage
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('idToken', data.idToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem('username', username);
      
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'An error occurred during sign in');
    }
  },

  async confirmSignUp(username, code) {
    const response = await fetch(`${API_URL}/auth/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors',
      credentials: 'same-origin',
      body: JSON.stringify({ username, code }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Failed to confirm signup');
    }
    
    return response.json();
  },

  async forgotPassword(username) {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Failed to initiate password reset');
    }
    
    return response.json();
  },

  async resetPassword(username, code, newPassword) {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, code, newPassword }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Failed to reset password');
    }
    
    return response.json();
  },

  async refreshToken(refreshToken, username) {
    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken, username }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Failed to refresh token');
    }
    
    const data = await response.json();
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('idToken', data.idToken);
    return data;
  },

  async verifyToken() {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message || 'Invalid token');
    }
    
    return response.json();
  },

  signOut() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('idToken');
    sessionStorage.removeItem('refreshToken');
  }
};