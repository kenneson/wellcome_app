import { Stack } from 'expo-router';

export default function EventLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="join" options={{ presentation: 'modal' }} />
            <Stack.Screen name="registrations" options={{ presentation: 'modal' }} />
        </Stack>
    );
}
