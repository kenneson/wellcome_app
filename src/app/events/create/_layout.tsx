import { Stack } from 'expo-router';
import { EventCreationProvider } from '@/shared/context/EventCreationContext';

export default function CreateEventLayout() {
    return (
        <EventCreationProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="menu" />
                <Stack.Screen name="location" />
                <Stack.Screen name="details" />
                <Stack.Screen name="settings" />
            </Stack>
        </EventCreationProvider>
    );
}
