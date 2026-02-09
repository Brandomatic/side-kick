import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // Import icons
import { COLORS } from '../theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import InfoScreen from '../screens/InfoScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',      // White icons when active
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)', // Faded white when inactive
        tabBarStyle: {
          backgroundColor: COLORS.primary,      // Matches your brand color
          borderTopWidth: 0,                    // Removes the default gray line
          height: 70,                           // Slightly taller for a modern look
          paddingBottom: 10,
          paddingTop: 10,
          borderTopLeftRadius: 20,              // Optional: rounded top corners
          borderTopRightRadius: 20,
          position: 'absolute',                 // Makes it "float" if you want
          elevation: 5,                         // Shadow for Android
          shadowColor: '#000',                  // Shadow for iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Information" 
        component={InfoScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}