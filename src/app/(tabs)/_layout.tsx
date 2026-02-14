import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Dimensions, Spacing } from '@/shared/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: '#CDCDE0',
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.light.background,
          height: Dimensions.tabBar.height + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          paddingBottom: insets.bottom + Spacing.xs,
          paddingTop: Spacing.xs,
          elevation: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={Dimensions.icon.xlarge} 
              name={focused ? 'home' : 'home-outline'} 
              color={color}
              accessibilityLabel="Início"
            />
          ),
          tabBarAccessibilityLabel: 'Ir para página inicial',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={Dimensions.icon.xlarge} 
              name={focused ? 'person' : 'person-outline'} 
              color={color}
              accessibilityLabel="Perfil"
            />
          ),
          tabBarAccessibilityLabel: 'Ir para perfil',
        }}
      />
    </Tabs>
  );
}
