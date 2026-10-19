import { router, type Href } from 'expo-router';

/**
 * Navigation helpers that keep the history short, so the Android back gesture
 * behaves like a native app instead of replaying every screen visited.
 *
 * `router.replace` swaps only the top screen: replacing a finished flow with
 * `/(tabs)` leaves a second copy of the tabs on top of the first one. These
 * helpers return to the screen that is already in the history instead.
 */

/** Closes everything stacked over the tabs, optionally switching tab (e.g. `/(tabs)/profile`). */
export function goHome(href: Href = '/(tabs)') {
    router.dismissTo(href);
}

/** Leaves the login screen as the only screen, so back from it closes the app. */
export function resetToLogin() {
    router.dismissTo('/(tabs)');
    router.replace('/auth/login');
}
