import { useUserProfile } from '@/context/UserProfileContext';
import { getEventCreationReturnPath } from '@/features/create-event/model/payoutReturn';
import { supabase } from '@/shared/lib/supabase';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

const STEPS = [
    { id: 0, title: 'Verificação', icon: 'shield-checkmark' },
    { id: 1, title: 'Documento', icon: 'card' },
    { id: 2, title: 'Selfie', icon: 'camera' },
    { id: 3, title: 'Resultado', icon: 'checkmark-circle' },
];

type KycResult = {
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    similarityScore?: number;
    reason?: string;
    canRetry?: boolean;
};

export default function KycVerificationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ returnTo?: string | string[]; draftId?: string | string[] }>();
    const { refetchProfile, kycStatus: existingKycStatus } = useUserProfile();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(1));
    const [documentImage, setDocumentImage] = useState<string | null>(null);
    const [selfieImage, setSelfieImage] = useState<string | null>(null);
    const [kycResult, setKycResult] = useState<KycResult | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const returnPath = getEventCreationReturnPath(params.returnTo, params.draftId);
    const finish = () => returnPath ? router.replace(returnPath as any) : router.replace('/(tabs)');

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
            }

            // If user already has a PENDING status, show pending screen
            if (existingKycStatus === 'PENDING') {
                setStep(3);
                setKycResult({ status: 'PENDING' });
            }
            // If REJECTED, show the intro to retry
            // (step 0 is already the default)
        };
        init();
    }, [existingKycStatus]);

    const animateTransition = (nextStep: number) => {
        const duration = reducedMotion ? 0 : 150;
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setStep(nextStep), duration);
    };

    const pickDocument = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para fotografar seu documento.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [16, 10],
        });

        if (!result.canceled && result.assets[0]) {
            setDocumentImage(result.assets[0].uri);
        }
    };

    const pickFromGalleryDocument = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [16, 10],
        });

        if (!result.canceled && result.assets[0]) {
            setDocumentImage(result.assets[0].uri);
        }
    };

    const takeSelfie = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para tirar sua selfie.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
            cameraType: ImagePicker.CameraType.front,
        });

        if (!result.canceled && result.assets[0]) {
            setSelfieImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string, path: string): Promise<string> => {
        const response = await fetch(uri);
        const blob = await response.blob();

        // Convert blob to ArrayBuffer
        const arrayBuffer = await new Response(blob).arrayBuffer();

        const { error } = await supabase.storage
            .from('kyc-documents')
            .upload(path, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: false,
            });

        if (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }

        return path;
    };

    const submitVerification = async () => {
        if (!documentImage || !selfieImage || !userId) {
            Alert.alert('Erro', 'Por favor, tire as duas fotos antes de enviar.');
            return;
        }

        setLoading(true);
        animateTransition(3);

        try {
            // Upload images to Supabase Storage
            const submissionId = Crypto.randomUUID();
            const documentPath = `${userId}/${submissionId}/document.jpg`;
            const selfiePath = `${userId}/${submissionId}/selfie.jpg`;

            await Promise.all([
                uploadImage(documentImage, documentPath),
                uploadImage(selfieImage, selfiePath),
            ]);

            // Call Edge Function
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Sessão expirada');
            }

            const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-kyc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    documentPath,
                    selfiePath,
                }),
            });

            let result;
            try {
                // If the response is not valid JSON, we want to know what it is
                result = await response.json();
            } catch {
                throw new Error(`Servidor retornou erro inesperado: ${response.status}.`);
            }

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Nao foi possivel concluir a verificacao');
            }

            setKycResult(result);

            if (result.status === 'APPROVED') {
                // Refetch profile to update the app state
                await refetchProfile();
            }
        } catch (error: any) {
            console.error('KYC submission error:', error);
            setKycResult({
                status: 'REJECTED',
                reason: error.message || 'Erro ao processar verificação. Tente novamente.',
                canRetry: true,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setDocumentImage(null);
        setSelfieImage(null);
        setKycResult(null);
        animateTransition(1);
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

    const renderIntroStep = () => (
        <View style={styles.centerSection}>
            <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={52} color={Palette.orangeDeep} />
            </View>
            <Text style={styles.title}>Verificação de Identidade</Text>
            <Text style={styles.subtitle}>Segurança para nossa comunidade</Text>
            <Text style={styles.description}>
                O Wellcome é uma comunidade baseada em confiança. Para garantir a segurança de todos,
                precisamos verificar sua identidade.
            </Text>

            <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                    <Ionicons name="card-outline" size={24} color={Palette.orangeDeep} />
                    <View style={styles.infoCardText}>
                        <Text style={styles.infoCardTitle}>Foto do RG ou CNH</Text>
                        <Text style={styles.infoCardDesc}>Tire uma foto clara do seu documento</Text>
                    </View>
                </View>
                <View style={styles.infoCard}>
                    <Ionicons name="camera-outline" size={24} color={Palette.orangeDeep} />
                    <View style={styles.infoCardText}>
                        <Text style={styles.infoCardTitle}>Selfie</Text>
                        <Text style={styles.infoCardDesc}>Tire uma selfie com boa iluminação</Text>
                    </View>
                </View>
                <View style={styles.infoCard}>
                    <Ionicons name="lock-closed-outline" size={24} color={Palette.orangeDeep} />
                    <View style={styles.infoCardText}>
                        <Text style={styles.infoCardTitle}>100% Privado</Text>
                        <Text style={styles.infoCardDesc}>Suas fotos são criptografadas e privadas</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderDocumentStep = () => (
        <View style={styles.centerSection}>
            <Text style={styles.title}>Foto do Documento</Text>
            <Text style={styles.subtitle}>RG ou CNH — frente com foto</Text>

            {documentImage ? (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: documentImage }} style={styles.documentPreview} />
                    <TouchableOpacity style={styles.retakeButton} onPress={() => setDocumentImage(null)} accessibilityRole="button">
                        <Ionicons name="refresh" size={18} color={Palette.ink} />
                        <Text style={styles.retakeText}>Tirar outra foto</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.captureArea}>
                    <View style={styles.documentPlaceholder}>
                        <Ionicons name="card-outline" size={64} color={Palette.subtle} />
                        <Text style={styles.placeholderText}>Frente do RG ou CNH</Text>
                    </View>

                    <TouchableOpacity style={styles.captureButton} onPress={pickDocument} accessibilityRole="button">
                        <Ionicons name="camera" size={22} color="#FFFFFF" />
                        <Text style={styles.captureButtonText}>Tirar Foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.galleryButton} onPress={pickFromGalleryDocument} accessibilityRole="button">
                        <Ionicons name="images-outline" size={20} color={Palette.ink} />
                        <Text style={styles.galleryButtonText}>Escolher da galeria</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.tipBox}>
                <Ionicons name="bulb-outline" size={20} color={Palette.orangeDeep} />
                <Text style={styles.tipText}>
                    Certifique-se que a foto do documento está bem iluminada e sem reflexos.
                </Text>
            </View>
        </View>
    );

    const renderSelfieStep = () => (
        <View style={styles.centerSection}>
            <Text style={styles.title}>Selfie</Text>
            <Text style={styles.subtitle}>Tire uma selfie de rosto</Text>

            {selfieImage ? (
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: selfieImage }} style={styles.selfiePreview} />
                    <TouchableOpacity style={styles.retakeButton} onPress={() => setSelfieImage(null)} accessibilityRole="button">
                        <Ionicons name="refresh" size={18} color={Palette.ink} />
                        <Text style={styles.retakeText}>Tirar outra selfie</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.captureArea}>
                    <View style={styles.selfiePlaceholder}>
                        <Ionicons name="person-circle-outline" size={80} color={Palette.subtle} />
                        <Text style={styles.placeholderText}>Sua selfie</Text>
                    </View>

                    <TouchableOpacity style={styles.captureButton} onPress={takeSelfie} accessibilityRole="button">
                        <Ionicons name="camera" size={22} color="#FFFFFF" />
                        <Text style={styles.captureButtonText}>Tirar Selfie</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.tipBox}>
                <Ionicons name="bulb-outline" size={20} color={Palette.orangeDeep} />
                <Text style={styles.tipText}>
                    Mantenha o rosto centralizado, olhe para a câmera e garanta boa iluminação.
                </Text>
            </View>
        </View>
    );

    const renderResultStep = () => {
        if (loading) {
            return (
                <View style={styles.centerSection}>
                    <View style={[styles.iconCircle, { backgroundColor: Palette.blueSoft }]}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                    <Text style={styles.title}>Verificando...</Text>
                    <Text style={styles.description}>
                        Estamos analisando suas fotos. Isso pode levar alguns segundos.
                    </Text>
                </View>
            );
        }

        if (!kycResult) return null;

        if (kycResult.status === 'APPROVED') {
            return (
                <View style={styles.centerSection}>
                    <View style={[styles.iconCircle, { backgroundColor: Palette.greenSoft }]}>
                        <Ionicons name="checkmark-circle" size={52} color={Palette.green} />
                    </View>
                    <Text style={styles.title}>Verificado! ✅</Text>
                    <Text style={styles.description}>
                        Sua identidade foi confirmada com sucesso. Bem-vindo ao Wellcome!
                    </Text>
                    {kycResult.similarityScore && (
                        <Text style={styles.scoreText}>
                            Confiança: {kycResult.similarityScore}%
                        </Text>
                    )}
                </View>
            );
        }

        if (kycResult.status === 'PENDING') {
            return (
                <View style={styles.centerSection}>
                    <View style={[styles.iconCircle, { backgroundColor: Palette.orangeSoft }]}>
                        <Ionicons name="time" size={52} color={Palette.orangeDarker} />
                    </View>
                    <Text style={styles.title}>Em Análise</Text>
                    <Text style={styles.description}>
                        Suas fotos foram enviadas e estão sendo analisadas pela nossa equipe.
                        Você receberá uma notificação quando o processo for concluído.
                    </Text>
                    <Text style={styles.pendingNote}>
                        Tempo estimado: até 24 horas
                    </Text>
                </View>
            );
        }

        // REJECTED
        return (
            <View style={styles.centerSection}>
                <View style={[styles.iconCircle, { backgroundColor: Palette.dangerLine }]}>
                    <Ionicons name="close-circle" size={52} color={Palette.danger} />
                </View>
                <Text style={styles.title}>Verificação Falhou</Text>
                <Text style={styles.description}>
                    {kycResult.reason || 'Não foi possível verificar sua identidade.'}
                </Text>
                {kycResult.canRetry && (
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetry} accessibilityRole="button">
                        <Ionicons name="refresh" size={20} color="#FFFFFF" />
                        <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const canProceed = () => {
        if (step === 1) return !!documentImage;
        if (step === 2) return !!selfieImage;
        return true;
    };

    const handleNext = () => {
        if (step === 0) {
            animateTransition(1);
        } else if (step === 1) {
            if (!documentImage) {
                Alert.alert('Atenção', 'Tire uma foto do seu documento antes de continuar.');
                return;
            }
            animateTransition(2);
        } else if (step === 2) {
            if (!selfieImage) {
                Alert.alert('Atenção', 'Tire uma selfie antes de enviar.');
                return;
            }
            submitVerification();
        }
    };

    const handleBack = () => {
        if (step > 0 && step < 3) {
            animateTransition(step - 1);
        }
    };

    const showFooter = step < 3 || kycResult?.status === 'APPROVED' || kycResult?.status === 'PENDING';

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <BrandStackHeader eyebrow="SEGURANÇA" title="Verificação de identidade" onBack={finish}>
                {step > 0 && renderProgressIndicator()}
            </BrandStackHeader>

            <BrandSheet>
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                        <View style={styles.card}>
                            {step === 0 && renderIntroStep()}
                            {step === 1 && renderDocumentStep()}
                            {step === 2 && renderSelfieStep()}
                            {step === 3 && renderResultStep()}
                        </View>
                    </Animated.View>
                </ScrollView>

                {showFooter && (
                    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
                        {step > 0 && step < 3 && (
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

                        {step < 3 && (
                            <TouchableOpacity
                                style={[
                                    styles.nextButton,
                                    step === 0 && styles.nextButtonFull,
                                    !canProceed() && styles.nextButtonDisabled,
                                    loading && styles.nextButtonDisabled,
                                ]}
                                onPress={handleNext}
                                disabled={loading || !canProceed()}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: loading || !canProceed(), busy: loading }}
                            >
                                <Text style={styles.nextButtonText}>
                                    {step === 0 ? 'Iniciar Verificação' :
                                        step === 2 ? 'Enviar para Verificação' : 'Continuar'}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}

                        {step === 3 && (kycResult?.status === 'APPROVED' || kycResult?.status === 'PENDING') && (
                            <TouchableOpacity
                                style={[styles.nextButton, styles.nextButtonFull]}
                                onPress={async () => { await refetchProfile(); finish(); }}
                                accessibilityRole="button"
                            >
                                <Text style={styles.nextButtonText}>{returnPath ? 'Voltar ao evento' : 'Concluir'}</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </BrandSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    flex: {
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
    centerSection: {
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: Palette.orangeSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: Palette.orangeDeep,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: Palette.inkSoft,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: Spacing.xl,
    },
    infoCards: {
        width: '100%',
        gap: Spacing.md,
        marginTop: Spacing.sm,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.paper,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: 14,
        borderRadius: BorderRadius.lg,
        gap: 14,
    },
    infoCardText: {
        flex: 1,
    },
    infoCardTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: 2,
    },
    infoCardDesc: {
        fontSize: 13,
        color: Palette.inkSoft,
    },
    captureArea: {
        alignItems: 'center',
        width: '100%',
        marginVertical: Spacing.lg,
    },
    documentPlaceholder: {
        width: '100%',
        height: 200,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Palette.line,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Palette.paper,
        marginBottom: Spacing.xl,
    },
    selfiePlaceholder: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: Palette.line,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Palette.paper,
        marginBottom: Spacing.xl,
    },
    placeholderText: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Palette.muted,
    },
    captureButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.orange,
        paddingHorizontal: Spacing.xxxl,
        borderRadius: BorderRadius.full,
        gap: 10,
    },
    captureButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    galleryButton: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
        gap: 8,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    galleryButtonText: {
        fontSize: 14,
        color: Palette.ink,
        fontWeight: '800',
    },
    imagePreviewContainer: {
        alignItems: 'center',
        width: '100%',
        marginVertical: Spacing.lg,
    },
    documentPreview: {
        width: '100%',
        height: 200,
        borderRadius: BorderRadius.lg,
        resizeMode: 'cover',
        borderWidth: 2,
        borderColor: Palette.green,
    },
    selfiePreview: {
        width: 200,
        height: 200,
        borderRadius: 100,
        resizeMode: 'cover',
        borderWidth: 3,
        borderColor: Palette.green,
    },
    retakeButton: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.md,
        gap: 6,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    retakeText: {
        fontSize: 14,
        color: Palette.ink,
        fontWeight: '800',
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Palette.orangeSoft,
        padding: 14,
        borderRadius: BorderRadius.lg,
        gap: 10,
        width: '100%',
        marginTop: Spacing.lg,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: Palette.orangeDarker,
        lineHeight: 19,
    },
    scoreText: {
        fontSize: 14,
        color: Palette.green,
        fontWeight: '800',
        marginTop: 4,
    },
    pendingNote: {
        fontSize: 14,
        color: Palette.orangeDarker,
        fontWeight: '700',
        marginTop: Spacing.sm,
        fontStyle: 'italic',
    },
    retryButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.orange,
        paddingHorizontal: Spacing.xxxl,
        borderRadius: BorderRadius.full,
        gap: 10,
        marginTop: Spacing.xl,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
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
        flex: 1,
        minHeight: 48,
        backgroundColor: Palette.orange,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
        gap: 8,
        ...Elevation.floating,
    },
    nextButtonFull: {
        flex: 1,
        marginLeft: 0,
    },
    nextButtonDisabled: {
        opacity: 0.5,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '800',
    },
});
