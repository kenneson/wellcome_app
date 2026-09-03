import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import './global.css';


import { AppLoadingScreen } from '@/components/ui/AppLoadingScreen';
import { userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KycStatus, UserProfileContext } from '@/context/UserProfileContext';
import { usePushNotifications } from '@/shared/hooks/usePushNotifications';
import { queryClient } from '@/shared/lib/react-query';
import { GluestackUIProvider } from '@/shared/ui/gluestack-ui-provider';
import { QueryClientProvider } from '@tanstack/react-query';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {

  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>(null);
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
        setKycStatus(null);
        lastUserId.current = null;
      } else {
        setProfileCheckLoading(true);
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
      const profile = await userService.getProfile(session.user.id).catch((error) => {
        console.error('Error fetching profile:', error);
        return null;
      });
      if (!profile) {
        setIsProfileComplete(false);
        setKycStatus(null);
      } else {
        console.log('Profile data:', profile);
        const complete = !!(profile.fullName && profile.occupation && profile.city && profile.neighborhood);
        console.log('Is profile complete?', complete);
        setIsProfileComplete(complete);
        setKycStatus(profile.kycStatus as KycStatus || 'NOT_SUBMITTED');
      }
    } catch (e) {
      console.error('Exception checking profile:', e);
      setIsProfileComplete(false);
      setKycStatus(null);
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
  const currentSegment = segments[0] as string;
  const inAuthGroup = currentSegment === 'auth';

  useEffect(() => {
    if (!initialized) return;

    if (!session && !inAuthGroup) {
      // Not logged in -> go to login
      router.replace('/auth/login');
      return;
    }

    if (session && inAuthGroup) {
      router.replace('/(tabs)');
      return;
    }

    // Check for incomplete profile
    if (session && isProfileComplete === false) {
      // Allow access to welcome screen
      if (currentSegment === 'welcome') return;

      // Force redirect to welcome/onboarding
      router.replace('/welcome');
      return;
    }
    // KYC is required only for financial host actions, not general app access.
    else if (session && isProfileComplete === true) {
      if (currentSegment === 'welcome') {
        router.replace('/(tabs)');
      }
    }
  }, [currentSegment, initialized, session, segments, isProfileComplete, inAuthGroup, router]);

  if (
    !initialized ||
    (session && profileCheckLoading) ||
    (session && isProfileComplete === null) ||
    (!session && !inAuthGroup) ||
    (session && inAuthGroup)
  ) {
    return <AppLoadingScreen />;
  }

  const isEventDetails = currentSegment === 'events' && segments[1] === '[id]';

  return (
    <GluestackUIProvider mode="light">
      <QueryClientProvider client={queryClient}>
        <UserProfileContext.Provider value={{ isProfileComplete, kycStatus, refetchProfile }}>
          <ThemeProvider value={DefaultTheme}>
            <View style={{ flex: 1, backgroundColor: '#FF8C42' }}>
            {!isEventDetails && (
              <>
                <StatusBar style="light" />
                <View style={{ height: insets.top, backgroundColor: '#FF8C42', width: '100%', position: 'absolute', top: 0, zIndex: 1000, pointerEvents: 'none' }} />
              </>
            )}
            {isEventDetails && <StatusBar style="light" />}
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="profile/my-events" options={{ headerShown: false }} />
                <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="notifications/index" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="messages" options={{ headerShown: false }} />
                <Stack.Screen
                  name="welcome"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="kyc"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    headerShown: false,
                  }}
                />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="events/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="events/create" options={{ headerShown: false }} />
                <Stack.Screen name="legal/[document]" options={{ headerShown: false }} />
              </Stack>
            </View>
            </View>
          </ThemeProvider>
        </UserProfileContext.Provider>
      </QueryClientProvider>
    </GluestackUIProvider>
  );
}
