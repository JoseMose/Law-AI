import * as React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import theme from './theme';
import RootNavigator from './navigation/RootNavigator';
import { AuthProvider } from './auth/AuthContext';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" />
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
