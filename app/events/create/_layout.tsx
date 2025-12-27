import { Stack } from 'expo-router';
import { EventCreationProvider } from '@/context/EventCreationContext';

export default function EventCreationLayout() {
    return (
        <EventCreationProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="menu" />
                <Stack.Screen name="location" />
                <Stack.Screen name="details" />
            </Stack>
        </EventCreationProvider>
    );
}
