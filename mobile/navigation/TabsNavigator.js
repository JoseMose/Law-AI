import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import CasesListScreen from '../screens/CasesListScreen';
import CaseDetailScreen from '../screens/CaseDetailScreen';
import ClientsListScreen from '../screens/ClientsListScreen';
import ClientProfileScreen from '../screens/ClientProfileScreen';
import BillingScreen from '../screens/BillingScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import UploadDocumentScreen from '../screens/UploadDocumentScreen';
import ResearchScreen from '../screens/ResearchScreen';
import AIDetailScreen from '../screens/AIDetailScreen';
import WebViewScreen from '../screens/WebViewScreen';
import BillingDetailScreen from '../screens/BillingDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function CasesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CasesList" component={CasesListScreen} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} />
      <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
    </Stack.Navigator>
  );
}

function ClientsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientsList" component={ClientsListScreen} />
      <Stack.Screen name="ClientProfile" component={ClientProfileScreen} />
    </Stack.Navigator>
  );
}

function DocumentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DocumentsList" component={DocumentsScreen} />
      <Stack.Screen name="UploadDocument" component={UploadDocumentScreen} />
    </Stack.Navigator>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0b67ff', tabBarLabelStyle: { fontSize: 12 } }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Cases"
        component={CasesStack}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="folder-multiple" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Clients"
        component={ClientsStack}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Documents"
        component={DocumentsStack}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="file-document" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="credit-card" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Research"
        component={ResearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain" color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog" color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function TabsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={Tabs} />
      <Stack.Screen name="AIDetail" component={AIDetailScreen} />
      <Stack.Screen name="WebViewScreen" component={WebViewScreen} />
      <Stack.Screen name="BillingDetail" component={BillingDetailScreen} />
    </Stack.Navigator>
  );
}
