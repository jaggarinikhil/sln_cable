import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, fontSize, fontWeight } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerProfileScreen from '../screens/CustomerProfileScreen';
import BillingScreen from '../screens/BillingScreen';
import PaymentsScreen from '../screens/PaymentsScreen';
import ComplaintsScreen from '../screens/ComplaintsScreen';
import WorkHoursScreen from '../screens/WorkHoursScreen';
import SalaryScreen from '../screens/SalaryScreen';
import ReportsScreen from '../screens/ReportsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import CustomerHistoryScreen from '../screens/CustomerHistoryScreen';
import MoreScreen from '../screens/MoreScreen';

// ---------------------------------------------------------------------------
// Shared stack screen options (dark header)
// ---------------------------------------------------------------------------
const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.bgCard },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: fontWeight.semibold, fontSize: fontSize.lg },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bgDark },
};

// ---------------------------------------------------------------------------
// Auth stack (login)
// ---------------------------------------------------------------------------
const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Per-tab stacks
// ---------------------------------------------------------------------------
const DashboardStack = createNativeStackNavigator();
function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={stackScreenOptions}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'Dashboard' }} />
    </DashboardStack.Navigator>
  );
}

const CustomersStack = createNativeStackNavigator();
function CustomersNavigator() {
  return (
    <CustomersStack.Navigator screenOptions={stackScreenOptions}>
      <CustomersStack.Screen name="CustomersList" component={CustomersScreen} options={{ title: 'Customers' }} />
      <CustomersStack.Screen name="CustomerProfile" component={CustomerProfileScreen} options={{ title: 'Customer' }} />
    </CustomersStack.Navigator>
  );
}

const BillingStack = createNativeStackNavigator();
function BillingNavigator() {
  return (
    <BillingStack.Navigator screenOptions={stackScreenOptions}>
      <BillingStack.Screen name="BillingHome" component={BillingScreen} options={{ title: 'Billing' }} />
    </BillingStack.Navigator>
  );
}

const PaymentsStack = createNativeStackNavigator();
function PaymentsNavigator() {
  return (
    <PaymentsStack.Navigator screenOptions={stackScreenOptions}>
      <PaymentsStack.Screen name="PaymentsHome" component={PaymentsScreen} options={{ title: 'Payments' }} />
    </PaymentsStack.Navigator>
  );
}

const MoreStack = createNativeStackNavigator();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={stackScreenOptions}>
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} options={{ title: 'More' }} />
      <MoreStack.Screen name="Complaints" component={ComplaintsScreen} options={{ title: 'Complaints' }} />
      <MoreStack.Screen name="WorkHours" component={WorkHoursScreen} options={{ title: 'Work Hours' }} />
      <MoreStack.Screen name="Salary" component={SalaryScreen} options={{ title: 'Salary' }} />
      <MoreStack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
      <MoreStack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: 'User Management' }} />
      <MoreStack.Screen name="CustomerHistory" component={CustomerHistoryScreen} options={{ title: 'Customer History' }} />
    </MoreStack.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Bottom Tab navigator
// ---------------------------------------------------------------------------
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const { user } = useAuth();
  const perms = user?.permissions || {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'home',
            Customers: 'people',
            Billing: 'receipt',
            Payments: 'card',
            More: 'ellipsis-horizontal',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardNavigator} />

      {perms.viewCustomers && (
        <Tab.Screen name="Customers" component={CustomersNavigator} />
      )}

      {perms.generateBill && (
        <Tab.Screen name="Billing" component={BillingNavigator} />
      )}

      {perms.recordPayment && (
        <Tab.Screen name="Payments" component={PaymentsNavigator} />
      )}

      <Tab.Screen name="More" component={MoreNavigator} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root navigator — switches between Auth and Main based on user state
// ---------------------------------------------------------------------------
const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {user ? (
        <RootStack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
