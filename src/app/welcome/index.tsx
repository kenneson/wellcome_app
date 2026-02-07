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
    const [step, setStep] = useState(1);
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
        if (step === 1) {
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

            if (error) throw error;

            await refetchProfile();
            // The layout will automatically redirect to (tabs) once isProfileComplete becomes true
        } catch (error: any) {
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
                                    {step === 1 ? 'Próximo' : 'Concluir'}
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
    },
    header: {
        marginTop: 40,
        marginBottom: 40,
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
    formSection: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F5F5F5',
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
        marginTop: 20,
        gap: 16,
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
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});
