import { AppIcon } from '@/components/ui/icon';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
import * as Haptics from 'expo-haptics';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = 64;

function tapFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
}

function TabButton(props: any) {
  const { children, delayLongPress, onPress, ...rest } = props;
  // normalize null -> undefined for props that TouchableOpacity doesn't accept as null
  const safeProps = { ...rest, delayLongPress: delayLongPress ?? undefined };
  return (
    <TouchableOpacity
      {...safeProps}
      onPress={(event) => {
        tapFeedback();
        onPress?.(event);
      }}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
    >
      {children}
    </TouchableOpacity>
  );
}

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      <AppIcon name={name} size={22} color={color} variant={focused ? 'Bold' : 'Linear'} />
    </View>
  );
}

function CreateTabButton() {
  const router = useRouter();
  return (
    <View style={styles.createSlot}>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          tapFeedback();
          router.push('/events/create');
        }}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Criar novo evento"
      >
        <AppIcon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Palette.orangeDeep,
        tabBarInactiveTintColor: Palette.muted,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Palette.surface,
          height: TAB_BAR_HEIGHT + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: Palette.lineSoft,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarButton: (props) => <TabButton {...props} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, focused }) => <TabIcon name="compass-outline" focused={focused} color={color as string} />,
          tabBarAccessibilityLabel: 'Explorar eventos perto de você',
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color, focused }) => <TabIcon name="ticket" focused={focused} color={color as string} />,
          tabBarAccessibilityLabel: 'Minhas reservas e ingressos',
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Criar',
          tabBarButton: () => <CreateTabButton />,
        }}
      />
      <Tabs.Screen
        name="host-events"
        options={{
          title: 'Anfitrião',
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar" focused={focused} color={color as string} />,
          tabBarAccessibilityLabel: 'Gerenciar os eventos que você oferece',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused }) => <TabIcon name="person-outline" focused={focused} color={color as string} />,
          tabBarAccessibilityLabel: 'Ir para perfil',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 52,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: Palette.orangeSoft,
  },
  createSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  createButton: {
    width: 56,
    height: 56,
    marginTop: -Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Palette.surface,
    ...Elevation.floating,
  },
});
