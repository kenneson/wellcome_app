import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/shared/lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { UserProfileContext } from '@/context/UserProfileContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/lib/react-query';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [profileCheckLoading, setProfileCheckLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  // 1. Handle Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Reset profile check on auth change/logout to force re-verify
      if (!session) {
        setIsProfileComplete(null);
        lastUserId.current = null;
        // Reset routing flag to allow redirection to login
        lastUserId.current = null;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkProfile(force = false) {
    if (!session?.user) {
      setProfileCheckLoading(false);
      return;
    }

    if (!force && session.user.id === lastUserId.current && isProfileComplete !== null) {
      // Same user, already checked. Skip.
      setProfileCheckLoading(false);
      return;
    }

    setProfileCheckLoading(true);
    lastUserId.current = session.user.id;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('occupation, looking_for, city, neighborhood')
        .eq('id', session.user.id)
        .single();

      if (error) {
        setIsProfileComplete(false);
      } else {
        const complete = !!(profile?.occupation && profile?.looking_for && profile?.city && profile?.neighborhood);
        setIsProfileComplete(complete);
      }
    } catch (e) {
      setIsProfileComplete(false);
    } finally {
      setProfileCheckLoading(false);
    }
  }

  const refetchProfile = async () => {
    await checkProfile(true);
  };

  // Auto check on session change - but we guard with ref to avoid loops if needed.
  // Actually, simple effect is fine if we are careful.
  useEffect(() => {
    if (initialized && session) {
      checkProfile();
    }
  }, [session, initialized]);


  // 3. Handle Navigation Protection
  const inAuthGroup = segments[0] === 'auth';

  useEffect(() => {
    if (!initialized) return;

    if (!session && !inAuthGroup) {
      // Not logged in -> go to login
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      // Logged in + in auth group -> go to tabs
      router.replace('/(tabs)');
    }
    // Check for incomplete profile
    else if (session && isProfileComplete === false) {
      // Allow access to welcome screen
      if (segments[0] === 'welcome') return;

      // Allow access to all routes - user can complete profile later
      // Only redirect to welcome on first login (handled by auth flow)
      return;
    }
  }, [initialized, session, segments, isProfileComplete, inAuthGroup]);

  if (
    !initialized ||
    (session && profileCheckLoading) ||
    (session && isProfileComplete === null) ||
    (!session && !inAuthGroup) ||
    (session && inAuthGroup)
  ) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileContext.Provider value={{ isProfileComplete, refetchProfile }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View style={{ flex: 1, backgroundColor: '#FF8C42' }}>
            <StatusBar style="light" backgroundColor="#FF8C42" />
            <View style={{ height: insets.top, backgroundColor: '#FF8C42', width: '100%', position: 'absolute', top: 0, zIndex: 1000 }} />
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="profile/my-events" options={{ headerShown: false }} />
                <Stack.Screen
                  name="welcome"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    headerShown: false,
                  }}
                />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="events/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="events/create" options={{ headerShown: false }} />
              </Stack>
            </View>
          </View>
        </ThemeProvider>
      </UserProfileContext.Provider>
    </QueryClientProvider>
  );
}