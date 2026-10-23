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
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandHeader, BrandSheet } from '@/components/ui/wellcome';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';
import { firstError, onboardingSteps, validateForm } from '@/shared/lib/validation';

const STEPS = [
    { id: 0, title: 'Bem-vindo', icon: 'hand-left' },
    { id: 1, title: 'Seu Nome', icon: 'person' },
    { id: 2, title: 'Sobre você', icon: 'briefcase' },
    { id: 3, title: 'Localização', icon: 'location' },
];

export default function WelcomeScreen() {
    const { refetchProfile } = useUserProfile();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showCityModal, setShowCityModal] = useState(false);
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
            const validation = validateForm(onboardingSteps.identity, formData);
            if (!validation.success) {
                Alert.alert('Atenção', firstError(validation.errors));
                return;
            }
            animateTransition(2);
        } else if (step === 2) {
            const validation = validateForm(onboardingSteps.occupation, formData);
            if (!validation.success) {
                Alert.alert('Atenção', firstError(validation.errors));
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
        const validation = validateForm(onboardingSteps.location, formData);
        if (!validation.success) {
            Alert.alert('Atenção', firstError(validation.errors));
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
            Alert.alert('Erro ao salvar', friendlyErrorMessage(error, 'Não foi possível salvar seu perfil. Tente novamente.'));
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
                            <Ionicons name="checkmark" size={14} color={Palette.orangeDeep} />
                        ) : (
                            <Ionicons name={s.icon as any} size={14} color={step >= s.id ? Palette.orangeDeep : '#FFFFFF'} />
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
                    <Ionicons name="people" size={52} color={Palette.orangeDeep} />
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
                    <Ionicons name="person-outline" size={18} color={Palette.orangeDeep} />
                    <Text style={styles.label}>Seu nome completo</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: João Silva"
                    placeholderTextColor={Palette.subtle}
                    value={formData.full_name}
                    onChangeText={(t) => updateForm('full_name', t)}
                    autoCapitalize="words"
                    autoFocus
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="at-outline" size={18} color={Palette.orangeDeep} />
                    <Text style={styles.label}>Username (único)</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: joaosilva"
                    placeholderTextColor={Palette.subtle}
                    value={formData.username}
                    onChangeText={(t) => updateForm('username', t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="document-text-outline" size={18} color={Palette.orangeDeep} />
                    <Text style={styles.label}>Bio (opcional)</Text>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Conte um pouco sobre você..."
                    placeholderTextColor={Palette.subtle}
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
                    <Ionicons name="briefcase-outline" size={18} color={Palette.orangeDeep} />
                    <Text style={styles.label}>Profissão / Ocupação</Text>
                </View>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Designer, Chef, Estudante..."
                    placeholderTextColor={Palette.subtle}
                    value={formData.occupation}
                    onChangeText={(t) => updateForm('occupation', t)}
                    autoCapitalize="words"
                />
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="search-outline" size={18} color={Palette.orangeDeep} />
                    <Text style={styles.label}>O que você busca aqui? (opcional)</Text>
                </View>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ex: Conhecer pessoas, novas experiências gastronômicas..."
                    placeholderTextColor={Palette.subtle}
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
                    <Ionicons name="business-outline" size={18} color={Palette.orangeDeep} />
                    <Text style={styles.label}>Cidade</Text>
                </View>
                {/* City comes from the IBGE list so it matches what event search uses. */}
                <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowCityModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel={formData.city ? `Cidade: ${formData.city}. Toque para alterar` : 'Selecionar cidade'}
                >
                    <Text style={{ color: formData.city ? Palette.ink : Palette.subtle, fontSize: 16 }}>
                        {formData.city || 'Toque para buscar sua cidade'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Ionicons name="location-outline" size={18} color={Palette.orangeDeep} />
                    <Text style={styles.label}>Bairro</Text>
                </View>
                {/* ponytail: free text, no reliable nationwide neighbourhood list (IBGE/Geoapify). */}
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Pinheiros"
                    placeholderTextColor={Palette.subtle}
                    value={formData.neighborhood}
                    onChangeText={(t) => updateForm('neighborhood', t)}
                    autoCapitalize="words"
                />
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BrandHeader eyebrow="PRIMEIROS PASSOS" title={STEPS[step]?.title ?? 'Bem-vindo'}>
                {step > 0 && renderProgressIndicator()}
            </BrandHeader>

            <BrandSheet>
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
                        <View style={styles.card}>
                            {step === 0 && renderWelcomeStep()}
                            {step === 1 && renderNameStep()}
                            {step === 2 && renderBioStep()}
                            {step === 3 && renderLocationStep()}
                        </View>
                    </Animated.View>
                </KeyboardAwareScrollView>

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
                    {step > 0 && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBack}
                            disabled={loading}
                            accessibilityRole="button"
                            accessibilityLabel="Voltar"
                        >
                            <Ionicons name="chevron-back" size={20} color={Palette.ink} />
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
                        accessibilityRole="button"
                        accessibilityState={{ disabled: loading, busy: loading }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Text style={styles.nextButtonText}>
                                    {step === 0 ? 'Vamos começar!' : (step === 3 ? 'Concluir' : 'Continuar')}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </BrandSheet>

            <LocationAutocomplete
                visible={showCityModal}
                onClose={() => setShowCityModal(false)}
                onSelectMunicipality={(municipality) => updateForm('city', municipality.name)}
                type="municipality"
                asModal
                value={formData.city}
                placeholder="Digite sua cidade"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.xl,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.xl,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    progressItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Palette.onBrandGlass,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressDotActive: {
        backgroundColor: Palette.surface,
    },
    progressLine: {
        width: 40,
        height: 3,
        borderRadius: 2,
        backgroundColor: Palette.onBrandGlass,
        marginHorizontal: 4,
    },
    progressLineActive: {
        backgroundColor: Palette.surface,
    },
    welcomeSection: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: Spacing.xl,
        borderWidth: 3,
        borderColor: Palette.orangeSoft,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Palette.orangeSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: Palette.orangeDeep,
        marginBottom: Spacing.xl,
    },
    welcomeText: {
        fontSize: 15,
        color: Palette.inkSoft,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: Spacing.md,
    },
    formSection: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.sm,
    },
    sectionSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginBottom: Spacing.xxl,
    },
    inputGroup: {
        marginBottom: Spacing.xl,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Palette.inkSoft,
    },
    input: {
        minHeight: 48,
        backgroundColor: Palette.surface,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 16,
        color: Palette.ink,
        borderWidth: 1,
        borderColor: Palette.line,
    },
    textArea: {
        minHeight: 90,
        paddingTop: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    backButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    backButtonText: {
        fontSize: 15,
        color: Palette.ink,
        fontWeight: '800',
    },
    nextButton: {
        minHeight: 48,
        backgroundColor: Palette.orange,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        borderRadius: BorderRadius.full,
        gap: 8,
        ...Elevation.floating,
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
        color: '#FFFFFF',
        fontWeight: '800',
    },
});
