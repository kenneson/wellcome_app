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
import { usePushNotifications } from '@/shared/hooks/usePushNotifications';

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

  // Initialize Push Notifications
  usePushNotifications(session?.user?.id);

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
      console.log('Checking profile for user:', session.user.id);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, occupation, looking_for, city, neighborhood')
        .eq('id', session.user.id)
        .maybeSingle(); // Use maybeSingle to avoid error when no row exists

      if (error) {
        console.error('Error fetching profile:', error);
        setIsProfileComplete(false);
      } else if (!profile) {
        // No profile row exists - treat as incomplete
        console.log('No profile found for user');
        setIsProfileComplete(false);
      } else {
        console.log('Profile data:', profile);
        // full_name, occupation, city, neighborhood are REQUIRED
        const complete = !!(profile.full_name && profile.occupation && profile.city && profile.neighborhood);
        console.log('Is profile complete?', complete);
        setIsProfileComplete(complete);
      }
    } catch (e) {
      console.error('Exception checking profile:', e);
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

      // Force redirect to welcome/onboarding
      router.replace('/welcome');
      return;
    }
    // Redirect to tabs if on welcome screen but profile is complete
    else if (session && isProfileComplete === true && segments[0] === 'welcome') {
      router.replace('/(tabs)');
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
                <Stack.Screen name="profile/notifications" options={{ headerShown: false, presentation: 'modal' }} />
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