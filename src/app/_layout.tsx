import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';

import { useColorScheme } from '@/shared/lib/hooks/use-color-scheme';
import { supabase } from '@/shared/lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

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
        hasInitiallyRouted.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Profile (Only when User ID changes)
  useEffect(() => {
    async function checkProfile() {
      if (!session?.user) {
        setProfileCheckLoading(false);
        return;
      }

      if (session.user.id === lastUserId.current && isProfileComplete !== null) {
        // Same user, already checked. Skip.
        setProfileCheckLoading(false);
        return;
      }

      setProfileCheckLoading(true);
      console.log('Checking profile for user:', session.user.id);
      lastUserId.current = session.user.id;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('occupation, looking_for')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.log('Profile check error:', error);
          setIsProfileComplete(false);
        } else {
          console.log('Profile data received:', profile);
          const complete = !!(profile?.occupation && profile?.looking_for);
          console.log('Profile completeness:', complete);
          setIsProfileComplete(complete);
        }
      } catch (e) {
        console.log('Profile check exception:', e);
        setIsProfileComplete(false);
      } finally {
        setProfileCheckLoading(false);
      }
    }

    if (initialized) {
      checkProfile();
    }
  }, [session, initialized]);

  const hasInitiallyRouted = useRef(false);

  // 3. Handle Initial Navigation (ONE TIME ONLY)
  useEffect(() => {
    if (!initialized) return;

    if (hasInitiallyRouted.current) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // Not logged in -> go to login
      router.replace('/auth/login');
    } else {
      // Logged in
      if (isProfileComplete === false) {
        console.log('→ Redirecting to welcome (profile incomplete)');
        router.replace('/welcome');
      } else if (session && inAuthGroup) {
        // Logged in + in auth group -> go to tabs
        router.replace('/(tabs)');
      }
      // If none of the above, we are logged in and profile is complete (or null/unknown but we waited for it)
      // Implicitly allow navigation to proceed (index.tsx handles root)
    }

    hasInitiallyRouted.current = true;
  }, [initialized, session, segments, isProfileComplete]);

  if (!initialized || (session && profileCheckLoading) || (session && isProfileComplete === null)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1, backgroundColor: '#FF8C42' }}>
        <StatusBar style="light" backgroundColor="#FF8C42" />
        <View style={{ height: insets.top, backgroundColor: '#FF8C42', width: '100%', position: 'absolute', top: 0, zIndex: 1000 }} />
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="profile/index" options={{ headerShown: false }} />
            <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: 'modal' }} />
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
  );
}