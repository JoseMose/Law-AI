import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import CasesListScreen from '../screens/CasesListScreen';
import CaseDetailScreen from '../screens/CaseDetailScreen';
import ClientProfileScreen from '../screens/ClientProfileScreen';
import BillingScreen from '../screens/BillingScreen';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Cases" component={CasesListScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
      <Stack.Screen name="ClientProfile" component={ClientProfileScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
    </Stack.Navigator>
  );
}
