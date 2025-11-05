import React from 'react';
import { useAuth } from '../auth/AuthContext';
import AuthStack from './AuthStack';
import TabsNavigator from './TabsNavigator';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null; // or a splash
  return user ? <TabsNavigator /> : <AuthStack />;
}
