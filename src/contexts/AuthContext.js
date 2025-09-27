import React, { useState, createContext, useContext, useEffect } from 'react';
import { authService } from '../services/auth-new';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        if (sessionStorage.getItem('accessToken')) {
          await authService.verifyToken();
          setUser({ username: sessionStorage.getItem('username') });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        sessionStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const value = {
    user,
    setUser,
    loading,
    signIn: async (username, password) => {
      const response = await authService.signIn(username, password);
      // If challenge was returned, forward it to caller (UI handles it)
      if (response && response.challenge) {
        return response;
      }
      // On successful sign in, set user
      if (response && response.accessToken) {
        sessionStorage.setItem('username', username);
        setUser({ username });
      }
      return response;
    },
    signOut: () => {
      authService.signOut();
      setUser(null);
    },
    signUp: authService.signUp,
    confirmSignUp: authService.confirmSignUp,
    forgotPassword: authService.forgotPassword,
    resetPassword: authService.resetPassword
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};