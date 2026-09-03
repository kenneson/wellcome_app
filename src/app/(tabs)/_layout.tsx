import { Colors, Dimensions, Spacing } from '@/shared/constants/theme';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Tabs } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabButton(props: any) {
  const { children, delayLongPress, ...rest } = props;
  // normalize null -> undefined for props that TouchableOpacity doesn't accept as null
  const safeProps = { ...rest, delayLongPress: delayLongPress ?? undefined };
  return (
    <TouchableOpacity {...safeProps} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      {children}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: '#7A8290',
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.light.background,
          height: Dimensions.tabBar.height + 8 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          paddingBottom: insets.bottom + 2,
          paddingTop: Spacing.xs,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={Dimensions.icon.xlarge} 
              name={focused ? 'home' : 'home-outline'} 
              color={color as string}
              accessibilityLabel="Início"
            />
          ),
          tabBarAccessibilityLabel: 'Ir para página inicial',
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="host-events"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={Dimensions.icon.xlarge}
              name="calendar"
              variant={focused ? 'Bold' : 'Linear'}
              color={color as string}
              accessibilityLabel="Eventos"
            />
          ),
          tabBarAccessibilityLabel: 'Gerenciar meus eventos',
          tabBarButton: (props) => <TabButton {...props} />,
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
              color={color as string}
              accessibilityLabel="Perfil"
            />
          ),
          tabBarAccessibilityLabel: 'Ir para perfil',
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />
    </Tabs>
  );
}
