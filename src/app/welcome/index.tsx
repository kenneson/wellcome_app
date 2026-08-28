import { useUserProfile } from '@/context/UserProfileContext';
import { userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const STEPS = [
    { id: 0, title: 'Bem-vindo', icon: 'hand-left' },
    { id: 1, title: 'Seu Nome', icon: 'person' },
    { id: 2, title: 'Sobre você', icon: 'briefcase' },
    { id: 3, title: 'Localização', icon: 'location' },
];

export default function WelcomeScreen() {
    const { refetchProfile } = useUserProfile();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(1));

    // User data from Google Auth
    const [googleData, setGoogleData] = useState<{
        avatarUrl: string;
        suggestedName: string;
    }>({ avatarUrl: '', suggestedName: '' });

    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        bio: '',
        occupation: '',
        looking_for: '',
        city: '',
        neighborhood: ''
    });

    // Fetch Google auth data on mount
    useEffect(() => {
        const fetchGoogleData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const meta = session.user.user_metadata;
                setGoogleData({
                    avatarUrl: meta?.avatar_url || meta?.picture || '',
                    suggestedName: meta?.full_name || meta?.name || ''
                });
                // Pre-fill name if available from Google
                if (meta?.full_name || meta?.name) {
                    setFormData(prev => ({
                        ...prev,
                        full_name: meta.full_name || meta.name || ''
                    }));
                }
            }
        };
        fetchGoogleData();
    }, []);

    const updateForm = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const animateTransition = (nextStep: number) => {
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setStep(nextStep), 150);
    };

    const handleNext = () => {
        if (step === 0) {
            animateTransition(1);
        } else if (step === 1) {
            if (!formData.full_name.trim()) {
                Alert.alert('Atenção', 'Por favor, informe seu nome.');
                return;
            }
            if (!formData.username.trim() || formData.username.length < 3) {
                Alert.alert('Atenção', 'Por favor, informe um username com pelo menos 3 caracteres.');
                return;
            }
            animateTransition(2);
        } else if (step === 2) {
            if (!formData.occupation.trim()) {
                Alert.alert('Atenção', 'Por favor, informe sua ocupação.');
                return;
            }
            animateTransition(3);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 0) {
            animateTransition(step - 1);
        }
    };

    const handleSubmit = async () => {
        if (!formData.city.trim()) {
            Alert.alert('Atenção', 'Por favor, informe sua cidade.');
            return;
        }
        if (!formData.neighborhood.trim()) {
            Alert.alert('Atenção', 'Por favor, informe seu bairro.');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Erro', 'Sessão expirada. Por favor, faça login novamente.');
                return;
            }

            await userService.updateProfile(session.user.id, {
                full_name: formData.full_name.trim(),
                username: formData.username.trim(),
                avatar_url: googleData.avatarUrl || null,
                bio: formData.bio.trim() || null,
                occupation: formData.occupation.trim(),
                looking_for: formData.looking_for.trim() || null,
                city: formData.city.trim(),
                neighborhood: formData.neighborhood.trim(),
            });

            await refetchProfile();
            // Layout will automatically redirect to (tabs) once isProfileComplete becomes true
        } catch (error: any) {
            console.error('Profile save error:', error);
            Alert.alert('Erro ao salvar', error.message || 'Não foi possível salvar seu perfil. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const renderProgressIndicator = () => (
        <View style={styles.progressContainer}>
            {STEPS.map((s, index) => (
                <View key={s.id} style={styles.progressItem}>
                    <View style={[
                        styles.progressDot,
                        step >= s.id && styles.progressDotActive
                    ]}>
                        {step > s.id ? (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                        ) : (
                            <Ionicons name={s.icon as any} size={14} color={step >= s.id ? '#fff' : '#ccc'} />
                        )}
                    </View>
                    {index < STEPS.length - 1 && (
                        <View style={[
                            styles.progressLine,
                            step > s.id && styles.progressLineActive
                        ]} />
                    )}
                </View>
            ))}
        </View>
    );

    const renderWelcomeStep = () => (
        <View style={styles.welcomeSection}>
            {googleData.avatarUrl ? (
                <Image source={{ uri: googleData.avatarUrl }} style={styles.avatarImage} />
            ) : (
                <View style={styles.iconCircle}>
                    <Ionicons name="people" size={56} color="#fff" />
                </View>
            )}
            <Text style={styles.welcomeTitle}>
                {googleData.suggestedName ? `Olá, ${googleData.suggestedName.split(' ')[0]}! 👋` : 'Olá! 👋'}
            </Text>
            <Text style={styles.welcomeSubtitle}>Bem-vindo ao Wellcome</Text>
            <Text style={styles.welcomeText}>
                Somos uma comunidade de pessoas reais que adoram compartilhar experiências gastronômicas.
            </Text>
            <Text style={styles.welcomeText}>
                Para começar, precisamos de algumas informações rápidas sobre você. Leva menos de 1 minuto!
            </Text>
        </View>
    );

    const renderNameStep = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Como você quer ser chamado?</Text>
            <Text style={styles.sectionSubtitle}>Este é o nome que outros membros verão</Text>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="person-outline" size={18} color="#FF8C42" />
                    <Text style={styles.label}>Seu nome completo</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: João Silva"
                    placeholderTextColor="#999"
                    value={formData.full_name}
                    onChangeText={(t) => updateForm('full_name', t)}
                    autoCapitalize="words"
                    autoFocus
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="at-outline" size={18} color="#FF8C42" />
                    <Text style={styles.label}>Username (único)</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: joaosilva"
                    placeholderTextColor="#999"
                    value={formData.username}
                    onChangeText={(t) => updateForm('username', t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="document-text-outline" size={18} color="#FF8C42" />
                    <Text style={styles.label}>Bio (opcional)</Text>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Conte um pouco sobre você..."
                    placeholderTextColor="#999"
                    value={formData.bio}
                    onChangeText={(t) => updateForm('bio', t)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />
            </View>
        </View>
    );

    const renderBioStep = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>O que você faz?</Text>
            <Text style={styles.sectionSubtitle}>Essas informações ajudam outros membros a te conhecer</Text>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="briefcase-outline" size={18} color="#FF8C42" />
                    <Text style={styles.label}>Profissão / Ocupação</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Designer, Chef, Estudante..."
                    placeholderTextColor="#999"
                    value={formData.occupation}
                    onChangeText={(t) => updateForm('occupation', t)}
                    autoCapitalize="words"
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="search-outline" size={18} color="#FF8C42" />
                    <Text style={styles.label}>O que você busca aqui? (opcional)</Text>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ex: Conhecer pessoas, novas experiências gastronômicas..."
                    placeholderTextColor="#999"
                    value={formData.looking_for}
                    onChangeText={(t) => updateForm('looking_for', t)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />
            </View>
        </View>
    );

    const renderLocationStep = () => (
        <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Onde você está?</Text>
            <Text style={styles.sectionSubtitle}>Isso nos ajuda a mostrar eventos perto de você</Text>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="business-outline" size={18} color="#FF8C42" />
                    <Text style={styles.label}>Cidade</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: São Paulo"
                    placeholderTextColor="#999"
                    value={formData.city}
                    onChangeText={(t) => updateForm('city', t)}
                    autoCapitalize="words"
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="location-outline" size={18} color="#FF8C42" />
                    <Text style={styles.label}>Bairro</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Pinheiros"
                    placeholderTextColor="#999"
                    value={formData.neighborhood}
                    onChangeText={(t) => updateForm('neighborhood', t)}
                    autoCapitalize="words"
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
                {step > 0 && renderProgressIndicator()}

                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    extraScrollHeight={40}
                    extraHeight={120}
                    enableResetScrollToCoords={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={styles.keyboardView}
                >
                    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                        {step === 0 && renderWelcomeStep()}
                        {step === 1 && renderNameStep()}
                        {step === 2 && renderBioStep()}
                        {step === 3 && renderLocationStep()}
                    </Animated.View>
                </KeyboardAwareScrollView>

                <View style={styles.footer}>
                    {step > 0 && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBack}
                            disabled={loading}
                        >
                            <Ionicons name="chevron-back" size={20} color="#666" />
                            <Text style={styles.backButtonText}>Voltar</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            step === 0 && styles.nextButtonFull,
                            loading && styles.nextButtonDisabled
                        ]}
                        onPress={handleNext}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.nextButtonText}>
                                    {step === 0 ? 'Vamos começar!' : (step === 3 ? 'Concluir' : 'Continuar')}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    progressItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E8E8E8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressDotActive: {
        backgroundColor: '#FF8C42',
    },
    progressLine: {
        width: 40,
        height: 3,
        backgroundColor: '#E8E8E8',
        marginHorizontal: 4,
    },
    progressLineActive: {
        backgroundColor: '#FF8C42',
    },
    welcomeSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 24,
        borderWidth: 3,
        borderColor: '#FF8C42',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FF8C42',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FF8C42',
        marginBottom: 24,
    },
    welcomeText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    formSection: {
        flex: 1,
        paddingTop: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#888',
        marginBottom: 28,
    },
    inputGroup: {
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
    },
    input: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#EBEBEB',
    },
    textArea: {
        minHeight: 90,
        paddingTop: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#fff',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        gap: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    nextButton: {
        backgroundColor: '#FF8C42',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 30,
        gap: 8,
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    nextButtonFull: {
        flex: 1,
        marginLeft: 0,
    },
    nextButtonDisabled: {
        opacity: 0.7,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});
