import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import 'react-native-reanimated';
import './global.css';


import { supabase } from '@/shared/lib/supabase';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { KycStatus, UserProfileContext } from '@/context/UserProfileContext';
import { usePushNotifications } from '@/shared/hooks/usePushNotifications';
import { queryClient } from '@/shared/lib/react-query';
import { QueryClientProvider } from '@tanstack/react-query';

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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, occupation, looking_for, city, neighborhood, kyc_status')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setIsProfileComplete(false);
        setKycStatus(null);
      } else if (!profile) {
        // No profile row exists - treat as incomplete
        console.log('No profile found for user');
        setIsProfileComplete(false);
        setKycStatus(null);
      } else {
        console.log('Profile data:', profile);
        // full_name, occupation, city, neighborhood are REQUIRED
        const complete = !!(profile.full_name && profile.occupation && profile.city && profile.neighborhood);
        console.log('Is profile complete?', complete);
        setIsProfileComplete(complete);
        setKycStatus(profile.kyc_status as KycStatus || 'NOT_SUBMITTED');
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
  const inKycGroup = currentSegment === 'kyc';

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
    // Profile complete — now check KYC
    else if (session && isProfileComplete === true) {
      // KYC not yet approved
      if (kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED') {
        if (!inKycGroup) {
          router.replace('/kyc' as any);
        }
        return;
      }

      // KYC pending — redirect to KYC screen (will show pending state)
      if (kycStatus === 'PENDING') {
        if (!inKycGroup) {
          router.replace('/kyc' as any);
        }
        return;
      }

      // KYC approved — allow access to app
      if (kycStatus === 'APPROVED') {
        // Redirect away from welcome/kyc if profile is complete and KYC approved
        if (currentSegment === 'welcome' || inKycGroup) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [initialized, session, segments, isProfileComplete, kycStatus, inAuthGroup, inKycGroup]);

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

  const isEventDetails = currentSegment === 'events' && segments[1] === '[id]';

  return (
    <QueryClientProvider client={queryClient}>
      <UserProfileContext.Provider value={{ isProfileComplete, kycStatus, refetchProfile }}>
        <ThemeProvider value={DefaultTheme}>
          <View style={{ flex: 1, backgroundColor: '#FF8C42' }}>
            {!isEventDetails && (
              <>
                <StatusBar style="light" backgroundColor="#FF8C42" />
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
              </Stack>
            </View>
          </View>
        </ThemeProvider>
      </UserProfileContext.Provider>
    </QueryClientProvider>
  );
}
