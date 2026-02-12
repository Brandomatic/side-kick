import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { UserContext, ToolbarContext } from './components/MyContexts';
import AppHeader from './components/AppHeader';

//Bottom Navigation
import TabNavigator from './navigation/TabNavigator';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import EquipmentDetailScreen from './screens/EquipmentDetailScreen';

//env setup
import { Config } from './config';

const Stack = createNativeStackNavigator();
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [user, setUser] = useState(null);
  // const [toolBarImages, setToolBarImages] = useState(null);

  const userProvider = useMemo(() => ({user, setUser}), [user, setUser]);

  useEffect(() => {
    async function prepare() {
      try {
        await Asset.fromModule(require('./assets/icon.png')).downloadAsync();

        await new Promise(resolve => setTimeout(resolve, 3500));
      } finally {
        setAppIsReady(true);
        console.log("Welcome to", Config.appName);
        console.log("Current Version:", Config.version);
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
    <UserContext.Provider value={userProvider}>
      <NavigationContainer onReady={onLayoutRootView}>
        <Stack.Navigator
          screenOptions={{ 
            headerShown: false,
            animation: 'fade'
          }}
        >
          {user ? (
            // APP SECTION
            <Stack.Group>
              <Stack.Screen 
                name="MainTabs" 
                component={TabNavigator} 
                options={({ navigation }) => ({
                  headerShown: true, // Turn header on for the main app
                  header: () => <AppHeader title="Side-Kick" navigation={navigation} />
                })}
              />
              
              {/* Profile Screen is a SIBLING to the Tabs, so it hides them when open */}
              <Stack.Screen 
                name="Profile" 
                component={ProfileScreen} 
                options={{ 
                  headerShown: true,
                  animation: 'slide_from_right', // Feels like a sub-menu
                  title: 'My Account' 
                }} 
              />

              <Stack.Screen 
                name="EquipmentDetail" 
                component={EquipmentDetailScreen} 
                options={({ route }) => ({ 
                  headerShown: true,
                  title: route.params?.unitId ? `Unit ${route.params.unitId}` : 'Details',
                  animation: 'slide_from_right'
                })} 
              />
            </Stack.Group>
          ) : (
            // AUTH SECTION
            <Stack.Group screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </UserContext.Provider>
  );
}