import { Colors, Dimensions, Spacing } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabButton(props: any) {
  const { children, delayLongPress, ...rest } = props;
  const safeProps = { ...rest, delayLongPress: delayLongPress ?? undefined };
  return (
    <TouchableOpacity {...safeProps} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      {children}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Count pending registrations across all hosted events
      const { data, error } = await supabase
        .from('event_participants')
        .select('id, events!inner(host_id)', { count: 'exact', head: true })
        .eq('status', 'PENDING')
        .eq('events.host_id', session.user.id);

      if (!error) {
        setPendingCount(data?.length ?? 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    // Re-check every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: '#CDCDE0',
        tabBarShowLabel: true,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
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
          title: 'Explorar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? 'compass' : 'compass-outline'} 
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Explorar eventos',
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Ingressos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? 'ticket' : 'ticket-outline'} 
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Meus ingressos e histórico',
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="hosting"
        options={{
          title: 'Anfitrião',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons 
                size={24} 
                name={focused ? 'home' : 'home-outline'} 
                color={focused ? Colors.host.primary : color}
              />
              {pendingCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -10,
                  backgroundColor: Colors.host.pendingBadge,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: Colors.light.background,
                }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontWeight: 'bold' }}>
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          tabBarActiveTintColor: Colors.host.primary,
          tabBarAccessibilityLabel: 'Painel do anfitrião',
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              size={24} 
              name={focused ? 'person' : 'person-outline'} 
              color={color}
            />
          ),
          tabBarAccessibilityLabel: 'Meu perfil e configurações',
          tabBarButton: (props) => <TabButton {...props} />,
        }}
      />
    </Tabs>
  );
}
