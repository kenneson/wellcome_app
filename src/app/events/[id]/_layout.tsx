import { Stack } from 'expo-router';

export default function EventLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="join" options={{ presentation: 'modal' }} />
            <Stack.Screen name="edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="registrations" options={{ presentation: 'modal' }} />
            <Stack.Screen name="review" options={{ presentation: 'modal' }} />
            <Stack.Screen name="ticket" options={{ presentation: 'modal' }} />
            <Stack.Screen name="payment" options={{ presentation: 'modal' }} />
            <Stack.Screen name="scanner" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
    );
}
