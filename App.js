import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';

// Contexts
import { UserContext } from './components/MyContexts';

// Components
import AppHeader from './components/AppHeader';
import TabNavigator from './navigation/TabNavigator';
import AdminTabNavigator from './navigation/AdminTabNavigator';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import CompanyRegistration from './screens/CompanyRegistration';
import ProfileScreen from './screens/ProfileScreen';
import EquipmentDetailScreen from './screens/EquipmentDetailScreen';
import AddEquipmentScreen from './screens/AddEquipmentScreen';
import QRScannerScreen from './screens/QRScannerScreen';
import InspectionFormScreen from './screens/InspectionFormScreen';
import CustomerSelectScreen from './screens/CustomerSelectScreen';
import MonitorWatchlistScreen from './screens/MonitorWatchlist';

// Config
import { Config } from './config';

const Stack = createNativeStackNavigator();
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // --- GLOBAL STATE BUCKETS ---
  const [user, setUser] = useState(null); // Firebase Auth Data + role
  const [currentCustomer, setCurrentCustomer] = useState(null); // The selected site
  const [currentEquipment, setCurrentEquipment] = useState(null); // The active crane

  // Memoize the provider to include our new Customer state
  const userProviderValue = useMemo(() => ({
    user, 
    setUser,
    currentCustomer,
    setCurrentCustomer,
    currentEquipment,
    setCurrentEquipment
  }), [user, currentCustomer, currentEquipment]);

  useEffect(() => {
    async function prepare() {
      try {
        await Asset.fromModule(require('./assets/icon.png')).downloadAsync();
        await new Promise(resolve => setTimeout(resolve, 3500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) return null;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <UserContext.Provider value={userProviderValue}>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{ 
              headerShown: false,
              animation: 'fade'
            }}
          >
            {!user ? (
              // 1. AUTH PATH: No user logged in
              <Stack.Group screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="Company Registration" component={CompanyRegistration} />
              </Stack.Group>
            ) : !currentCustomer ? (
              // 2. CONTEXT PATH: User is in, but hasn't picked a Customer Site
              <Stack.Group screenOptions={{ headerShown: true, title: 'Select Customer' }}>
                <Stack.Screen name="CustomerSelect" component={CustomerSelectScreen} />
              </Stack.Group>
            ) : (
              // 3. APP PATH: User & Customer are both set. Show UI based on Role.
              <Stack.Group>
                <Stack.Screen 
                  name="MainTabs" 
                  // Logic: If user is admin, we eventually swap this for AdminTabNavigator
                  component={user?.role === 'admin' ? AdminTabNavigator : TabNavigator} 
                  options={({ route, navigation }) => ({
                    header: () => (
                      <AppHeader 
                        title={getFocusedRouteNameFromRoute(route) ?? 'Dashboard'} 
                        navigation={navigation} 
                        // Pass currentCustomer name to header if you want it displayed
                        customerName={currentCustomer?.name}
                      />
                    ),
                    headerShown: true, 
                  })} 
                />
                
                {/* GLOBAL APP SCREENS */}
                <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'My Account', headerBackTitle: 'Back' }} />
                <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} options={{ headerShown: true, headerBackTitle: 'Back' }} />
                <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="InspectionForm" component={InspectionFormScreen} options={{ headerBackTitle: 'Back' }} />
                <Stack.Screen name="AddEquipment" component={AddEquipmentScreen} options={{ headerShown: true, title: 'Add Asset', headerBackTitle: 'Back' }} />
                <Stack.Screen name="MonitorList" component={MonitorWatchlistScreen} options={{ headerShown: true, title: 'Monitor List', headerBackTitle: 'Back' }} />
              </Stack.Group>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </UserContext.Provider>
    </SafeAreaProvider>
  );
}