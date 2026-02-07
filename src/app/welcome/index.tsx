import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/shared/lib/supabase';
import { useUserProfile } from '@/context/UserProfileContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
    const router = useRouter();
    const { refetchProfile } = useUserProfile();
    const [step, setStep] = useState(0); // 0 = Welcome, 1 = Bio, 2 = Location
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        occupation: '',
        looking_for: '',
        city: '',
        neighborhood: ''
    });

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleNext = () => {
        if (step === 0) {
            setStep(1);
        } else if (step === 1) {
            if (!formData.occupation.trim() || !formData.looking_for.trim()) {
                Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
                return;
            }
            setStep(2);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!formData.city.trim() || !formData.neighborhood.trim()) {
            Alert.alert('Atenção', 'Por favor, informe sua cidade e bairro.');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            console.log('Updating profile for:', session.user.id);
            console.log('Data:', formData);

            const { error } = await supabase
                .from('profiles')
                .update({
                    occupation: formData.occupation,
                    looking_for: formData.looking_for,
                    city: formData.city,
                    neighborhood: formData.neighborhood,
                    updated_at: new Date().toISOString()
                })
                .eq('id', session.user.id);

            if (error) {
                console.error('Error updating profile:', error);
                throw error;
            }

            console.log('Profile updated successfully. Refetching...');
            await refetchProfile();
            console.log('Refetch done.');
            // The layout will automatically redirect to (tabs) once isProfileComplete becomes true
        } catch (error: any) {
            console.error('Catch Error:', error);
            Alert.alert('Erro', error.message || 'Falha ao salvar perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Bem-vindo ao Wellcome!</Text>
                        <Text style={styles.subtitle}>
                            Para começar, precisamos conhecer um pouco mais sobre você.
                        </Text>
                    </View>

                    {step === 0 && (
                        <View style={styles.welcomeSection}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="people" size={64} color="#FF8C42" />
                            </View>
                            <Text style={styles.welcomeTitle}>Olá! Que bom ter você aqui.</Text>
                            <Text style={styles.welcomeText}>
                                O Wellcome é uma comunidade de pessoas reais. Para garantir a melhor experiência para todos, precisamos que você complete seu perfil.
                            </Text>
                            <Text style={styles.welcomeText}>
                                É rapidinho! Vamos lá?
                            </Text>
                        </View>
                    )}

                    {step === 1 && (
                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Sobre Você</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>O que você faz? (Profissão/Ocupação)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Designer, Chef, Estudante..."
                                    value={formData.occupation}
                                    onChangeText={(t) => updateForm('occupation', t)}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>O que você busca no app?</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Conhecer pessoas, novas experiências gastronômicas..."
                                    value={formData.looking_for}
                                    onChangeText={(t) => updateForm('looking_for', t)}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.formSection}>
                            <Text style={styles.sectionTitle}>Localização</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Cidade</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: São Paulo"
                                    value={formData.city}
                                    onChangeText={(t) => updateForm('city', t)}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Bairro</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Pinheiros"
                                    value={formData.neighborhood}
                                    onChangeText={(t) => updateForm('neighborhood', t)}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.footer}>
                        {step === 2 && (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setStep(1)}
                                disabled={loading}
                            >
                                <Text style={styles.backButtonText}>Voltar</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={handleNext}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.nextButtonText}>
                                    {step === 0 ? 'Completar Perfil' : (step === 1 ? 'Próximo' : 'Concluir')}
                                </Text>
                            )}
                            {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center', // Center content for welcome screen
    },
    header: {
        marginTop: 40,
        marginBottom: 20,
        display: 'none', // Hide default header, use custom welcome section
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FF8C42',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    welcomeSection: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 16,
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    formSection: {
        flex: 1,
        width: '100%',
        paddingTop: 40,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 40,
        gap: 16,
        paddingBottom: 20,
    },
    backButton: {
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    backButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    nextButton: {
        backgroundColor: '#FF8C42',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        gap: 8,
        minWidth: 140,
        elevation: 2,
        shadowColor: "#FF8C42",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});
