import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserProfile } from '@/context/UserProfileContext';

const { width } = Dimensions.get('window');

export default function WelcomeModal() {
    const router = useRouter();
    const { isProfileComplete } = useUserProfile();

    useEffect(() => {
        if (isProfileComplete === true) {
            router.replace('/(tabs)');
        }
    }, [isProfileComplete]);

    if (isProfileComplete === null) {
        return (
            <View style={[styles.container, { backgroundColor: 'white' }]}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Semi-transparent background overlay */}
            <View style={styles.overlay} />

            <View style={styles.modalContainer}>
                <View style={styles.content}>
                    <Text style={styles.title}>
                        Oba! Que bom que você veio, sinta-se em casa!
                    </Text>

                    <Text style={styles.body}>
                        Agora você pode participar de uma comunidade vibrante e hospitaleira.
                        Complete seu perfil para encontrar eventos que combinam com você e poder participar deles!
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => {
                            router.push('/profile/edit?mandatory=true');
                        }}
                    >
                        <Text style={styles.primaryButtonText}>Completar perfil</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: width * 0.9,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 32,
    },
    body: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
