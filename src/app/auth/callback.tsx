import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function AuthCallback() {
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ActivityIndicator size="large" color="#FF8C42" />
            <Text style={styles.text}>Autenticando...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    },
});
