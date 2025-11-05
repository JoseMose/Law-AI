import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/apiClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        api.defaults.headers.Authorization = `Bearer ${token}`;
        setUser({ token });
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (email, password) => {
    // Call backend auth endpoint
    const res = await api.post('/auth/signin', { email, password });
    const data = res.data || {};
    const token = data.accessToken || data.token || data.access_token;
    if (!token) throw new Error('No token returned from auth');
    await SecureStore.setItemAsync('accessToken', token);
    api.defaults.headers.Authorization = `Bearer ${token}`;
    setUser({ email });
    return data;
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    delete api.defaults.headers.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
