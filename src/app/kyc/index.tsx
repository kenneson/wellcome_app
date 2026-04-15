import { useUserProfile } from '@/context/UserProfileContext';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
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
    const { refetchProfile, kycStatus: existingKycStatus } = useUserProfile();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(1));
    const [documentImage, setDocumentImage] = useState<string | null>(null);
    const [selfieImage, setSelfieImage] = useState<string | null>(null);
    const [kycResult, setKycResult] = useState<KycResult | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

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
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setStep(nextStep), 150);
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
                upsert: true,
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
            const documentPath = `${userId}/document.jpg`;
            const selfiePath = `${userId}/selfie.jpg`;

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

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro na verificação');
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

    const renderIntroStep = () => (
        <View style={styles.centerSection}>
            <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={56} color="#fff" />
            </View>
            <Text style={styles.title}>Verificação de Identidade</Text>
            <Text style={styles.subtitle}>Segurança para nossa comunidade</Text>
            <Text style={styles.description}>
                O Wellcome é uma comunidade baseada em confiança. Para garantir a segurança de todos,
                precisamos verificar sua identidade.
            </Text>

            <View style={styles.infoCards}>
                <View style={styles.infoCard}>
                    <Ionicons name="card-outline" size={24} color="#FF8C42" />
                    <View style={styles.infoCardText}>
                        <Text style={styles.infoCardTitle}>Foto do RG ou CNH</Text>
                        <Text style={styles.infoCardDesc}>Tire uma foto clara do seu documento</Text>
                    </View>
                </View>
                <View style={styles.infoCard}>
                    <Ionicons name="camera-outline" size={24} color="#FF8C42" />
                    <View style={styles.infoCardText}>
                        <Text style={styles.infoCardTitle}>Selfie</Text>
                        <Text style={styles.infoCardDesc}>Tire uma selfie com boa iluminação</Text>
                    </View>
                </View>
                <View style={styles.infoCard}>
                    <Ionicons name="lock-closed-outline" size={24} color="#FF8C42" />
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
                    <TouchableOpacity style={styles.retakeButton} onPress={() => setDocumentImage(null)}>
                        <Ionicons name="refresh" size={18} color="#FF8C42" />
                        <Text style={styles.retakeText}>Tirar outra foto</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.captureArea}>
                    <View style={styles.documentPlaceholder}>
                        <Ionicons name="card-outline" size={64} color="#ccc" />
                        <Text style={styles.placeholderText}>Frente do RG ou CNH</Text>
                    </View>

                    <TouchableOpacity style={styles.captureButton} onPress={pickDocument}>
                        <Ionicons name="camera" size={24} color="#fff" />
                        <Text style={styles.captureButtonText}>Tirar Foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.galleryButton} onPress={pickFromGalleryDocument}>
                        <Ionicons name="images-outline" size={20} color="#FF8C42" />
                        <Text style={styles.galleryButtonText}>Escolher da galeria</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.tipBox}>
                <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
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
                    <TouchableOpacity style={styles.retakeButton} onPress={() => setSelfieImage(null)}>
                        <Ionicons name="refresh" size={18} color="#FF8C42" />
                        <Text style={styles.retakeText}>Tirar outra selfie</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.captureArea}>
                    <View style={styles.selfiePlaceholder}>
                        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
                        <Text style={styles.placeholderText}>Sua selfie</Text>
                    </View>

                    <TouchableOpacity style={styles.captureButton} onPress={takeSelfie}>
                        <Ionicons name="camera" size={24} color="#fff" />
                        <Text style={styles.captureButtonText}>Tirar Selfie</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.tipBox}>
                <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
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
                    <View style={[styles.iconCircle, { backgroundColor: '#6366F1' }]}>
                        <ActivityIndicator size="large" color="#fff" />
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
                    <View style={[styles.iconCircle, { backgroundColor: '#10B981' }]}>
                        <Ionicons name="checkmark-circle" size={56} color="#fff" />
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
                    <View style={[styles.iconCircle, { backgroundColor: '#F59E0B' }]}>
                        <Ionicons name="time" size={56} color="#fff" />
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
                <View style={[styles.iconCircle, { backgroundColor: '#EF4444' }]}>
                    <Ionicons name="close-circle" size={56} color="#fff" />
                </View>
                <Text style={styles.title}>Verificação Falhou</Text>
                <Text style={styles.description}>
                    {kycResult.reason || 'Não foi possível verificar sua identidade.'}
                </Text>
                {kycResult.canRetry && (
                    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                        <Ionicons name="refresh" size={20} color="#fff" />
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

    const showFooter = step < 3 || (kycResult?.status === 'APPROVED');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            {step > 0 && renderProgressIndicator()}

            <View style={styles.scrollContent}>
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {step === 0 && renderIntroStep()}
                    {step === 1 && renderDocumentStep()}
                    {step === 2 && renderSelfieStep()}
                    {step === 3 && renderResultStep()}
                </Animated.View>
            </View>

            {showFooter && (
                <View style={styles.footer}>
                    {step > 0 && step < 3 && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBack}
                            disabled={loading}
                        >
                            <Ionicons name="chevron-back" size={20} color="#666" />
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
                        >
                            <Text style={styles.nextButtonText}>
                                {step === 0 ? 'Iniciar Verificação' :
                                    step === 2 ? 'Enviar para Verificação' : 'Continuar'}
                            </Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}

                    {step === 3 && kycResult?.status === 'APPROVED' && (
                        <TouchableOpacity
                            style={[styles.nextButton, styles.nextButtonFull, { backgroundColor: '#10B981' }]}
                            onPress={() => refetchProfile()}
                        >
                            <Text style={styles.nextButtonText}>Entrar no Wellcome</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        flex: 1,
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
    centerSection: {
        alignItems: 'center',
        paddingVertical: 20,
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
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF8C42',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 12,
        marginBottom: 20,
    },
    infoCards: {
        width: '100%',
        gap: 12,
        marginTop: 8,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
        padding: 16,
        borderRadius: 14,
        gap: 14,
    },
    infoCardText: {
        flex: 1,
    },
    infoCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    infoCardDesc: {
        fontSize: 13,
        color: '#888',
    },
    captureArea: {
        alignItems: 'center',
        width: '100%',
        marginVertical: 16,
    },
    documentPlaceholder: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        marginBottom: 20,
    },
    selfiePlaceholder: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        marginBottom: 20,
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 14,
        color: '#aaa',
    },
    captureButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF8C42',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    captureButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    galleryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    galleryButtonText: {
        fontSize: 14,
        color: '#FF8C42',
        fontWeight: '500',
    },
    imagePreviewContainer: {
        alignItems: 'center',
        width: '100%',
        marginVertical: 16,
    },
    documentPreview: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        resizeMode: 'cover',
        borderWidth: 2,
        borderColor: '#10B981',
    },
    selfiePreview: {
        width: 200,
        height: 200,
        borderRadius: 100,
        resizeMode: 'cover',
        borderWidth: 3,
        borderColor: '#10B981',
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    retakeText: {
        fontSize: 14,
        color: '#FF8C42',
        fontWeight: '500',
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFBEB',
        padding: 14,
        borderRadius: 12,
        gap: 10,
        width: '100%',
        marginTop: 16,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        lineHeight: 18,
    },
    scoreText: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
        marginTop: 4,
    },
    pendingNote: {
        fontSize: 14,
        color: '#F59E0B',
        fontWeight: '600',
        marginTop: 8,
        fontStyle: 'italic',
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF8C42',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        gap: 10,
        marginTop: 20,
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 4,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
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
        opacity: 0.5,
    },
    nextButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});
