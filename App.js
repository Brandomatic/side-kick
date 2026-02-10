import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { UserContext, ToolbarContext } from './components/MyContexts';

//Bottom Navigation
import TabNavigator from './navigation/TabNavigator';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

//env setup
import { Config } from './config';

const Stack = createNativeStackNavigator();
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [user, setUser] = useState(null);
  // const [toolBarImages, setToolBarImages] = useState(null);

  const userProvider = useMemo(() => ({user, setUser}), [user, setUser]);
  // const toolBarImagesProvider = useMemo(() => ({toolBarImages, setToolBarImages}), [toolBarImages, setToolBarImages]);

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
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Main" component={TabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserContext.Provider>
  );
}