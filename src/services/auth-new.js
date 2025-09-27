const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const authService = {
  async signIn(username, password) {
    try {
      // Input validation
      if (!username?.trim()) {
        throw new AuthError('Username is required', 'INVALID_INPUT');
      }
      if (!password) {
        throw new AuthError('Password is required', 'INVALID_INPUT');
      }

      // API URL validation
      if (!API_URL) {
        throw new AuthError('API URL is not configured', 'CONFIG_ERROR');
      }

      console.log('Attempting sign in to:', API_URL);

      // Attempt the fetch with proper error handling
      let response;
      try {
        response = await fetch(`${API_URL}/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'same-origin',
          body: JSON.stringify({
            username: username.trim(),
            password
          }),
        });
      } catch (networkError) {
        console.error('Network error during sign in:', networkError);
        throw new AuthError(
          'Unable to connect to the server. Please check your internet connection and try again.',
          'NETWORK_ERROR'
        );
      }

      // Parse the response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing server response:', parseError);
        throw new AuthError('Invalid response from server', 'PARSE_ERROR');
      }

      // Handle error responses
      if (!response.ok) {
        console.error('Server error response:', data);
        if (response.status === 401) {
          throw new AuthError(data.error || 'Invalid username or password', 'AUTH_FAILED');
        }
        if (response.status === 400) {
          throw new AuthError(data.error || 'Invalid request', 'INVALID_REQUEST');
        }
        if (response.status === 500) {
          throw new AuthError('Server error. Please try again later.', 'SERVER_ERROR');
        }
        throw new AuthError(data.error || 'Failed to sign in', 'UNKNOWN_ERROR');
      }

      // If server returned a normal success with tokens
      if (data.success && data.accessToken && data.idToken) {
        try {
          sessionStorage.setItem('accessToken', data.accessToken);
          sessionStorage.setItem('idToken', data.idToken);
          sessionStorage.setItem('refreshToken', data.refreshToken);
          sessionStorage.setItem('username', username.trim());
        } catch (storageError) {
          console.error('Error storing auth data:', storageError);
          throw new AuthError('Failed to store authentication data', 'STORAGE_ERROR');
        }

        return {
          success: true,
          username: username.trim(),
          ...data
        };
      }

      // If Cognito returned a challenge, forward it to the caller to handle
      if (data.challenge) {
        return data; // { success:false, challenge, session, message }
      }

      console.error('Invalid success response:', data);
      throw new AuthError('Invalid authentication response from server', 'INVALID_RESPONSE');
    } catch (error) {
      // Ensure we always throw an AuthError
      if (error instanceof AuthError) {
        throw error;
      }
      console.error('Unexpected error during sign in:', error);
      throw new AuthError(error.message || 'An unexpected error occurred', 'UNKNOWN_ERROR');
    }
  },

  async respondToChallenge(username, session, challenge, newPassword) {
    try {
      if (!username?.trim() || !session || !challenge) {
        throw new AuthError('username, session and challenge are required', 'INVALID_INPUT');
      }

      const payload = { username: username.trim(), session, challenge };
      if (challenge === 'NEW_PASSWORD_REQUIRED') {
        if (!newPassword) throw new AuthError('newPassword is required', 'INVALID_INPUT');
        payload.newPassword = newPassword;
      }

      let response;
      try {
        response = await fetch(`${API_URL}/auth/respond-to-challenge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
      } catch (networkError) {
        console.error('Network error during respondToChallenge:', networkError);
        throw new AuthError('Unable to connect to the server', 'NETWORK_ERROR');
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        console.error('Respond to challenge server error:', data);
        throw new AuthError(data?.error || 'Challenge response failed', 'CHALLENGE_FAILED');
      }

      // If tokens are returned, store them
      if (data.success && data.tokens) {
        try {
          sessionStorage.setItem('accessToken', data.tokens.AccessToken);
          sessionStorage.setItem('idToken', data.tokens.IdToken);
          sessionStorage.setItem('refreshToken', data.tokens.RefreshToken);
          sessionStorage.setItem('username', username.trim());
        } catch (storageError) {
          console.error('Error storing auth data:', storageError);
          throw new AuthError('Failed to store authentication data', 'STORAGE_ERROR');
        }

        return { success: true, tokens: data.tokens };
      }

      // If another challenge is returned
      if (data.challenge) {
        return { success: false, challenge: data.challenge, session: data.session };
      }

      throw new AuthError('Invalid authentication response from server', 'INVALID_RESPONSE');
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.error('Unexpected error in respondToChallenge:', error);
      throw new AuthError(error.message || 'Unexpected error', 'UNKNOWN_ERROR');
    }
  },

  async signUp(username, password, email) {
    try {
      if (!username?.trim() || !password || !email?.trim()) {
        throw new AuthError('Username, password, and email are required', 'INVALID_INPUT');
      }

      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.trim(),
          password,
          email: email.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new AuthError(data.error || 'Failed to sign up', 'SIGNUP_FAILED');
      }

      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(error.message || 'Failed to sign up', 'SIGNUP_ERROR');
    }
  },

  async confirmSignUp(username, code) {
    try {
      if (!username?.trim() || !code?.trim()) {
        throw new AuthError('Username and confirmation code are required', 'INVALID_INPUT');
      }

      const response = await fetch(`${API_URL}/auth/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'same-origin',
        body: JSON.stringify({
          username: username.trim(),
          code: code.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new AuthError(data.error || 'Failed to confirm signup', 'CONFIRM_FAILED');
      }

      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(error.message || 'Failed to confirm signup', 'CONFIRM_ERROR');
    }
  },

  async verifyToken() {
    const token = sessionStorage.getItem('accessToken');
    if (!token) throw new AuthError('No token found', 'NO_TOKEN');

    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new AuthError(data?.error || 'Invalid token', 'INVALID_TOKEN');
      }

      return await response.json();
    } catch (err) {
      if (err instanceof AuthError) throw err;
      console.error('Unexpected error verifying token:', err);
      throw new AuthError('Token verification failed', 'VERIFY_FAILED');
    }
  },

  signOut() {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('Error during sign out:', error);
      throw new AuthError('Failed to complete sign out', 'SIGNOUT_ERROR');
    }
  }
};