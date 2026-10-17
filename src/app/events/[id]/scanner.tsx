import { registrationService } from '@/services/api/RegistrationService';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { HeaderIconButton } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

function ScannerHeader({ paddingTop, onBack }: { paddingTop: number; onBack: () => void }) {
    return (
        <View style={[styles.header, { paddingTop }]}>
            <HeaderIconButton icon="chevron-back" accessibilityLabel="Voltar" onPress={onBack} />
            <View style={styles.headerTitles}>
                <Text style={styles.headerEyebrow}>ANFITRIÃO</Text>
                <Text style={styles.headerTitle} accessibilityRole="header">Escanear ingresso</Text>
            </View>
        </View>
    );
}

// Dynamic import to avoid breaking other routes if expo-camera isn't available
let CameraView: any = null;
let useCameraPermissions: any = null;

try {
    const cameraModule = require('expo-camera');
    CameraView = cameraModule.CameraView;
    useCameraPermissions = cameraModule.useCameraPermissions;
} catch {
    // expo-camera not available - will show fallback UI
}

type ScanResult = {
    valid: boolean;
    message: string;
    booking?: {
        id: string;
        status: string;
        user?: { id: string; fullName: string; avatarUrl: string | null } | null;
        event?: { id: string; title: string } | null;
    };
};

type ScannerContentProps = {
    eventId: string | undefined;
    headerPaddingTop: number;
    onBack: () => void;
};

function ScannerContent({ eventId, headerPaddingTop, onBack }: ScannerContentProps) {
    const [permission, requestPermission] = useCameraPermissions!();
    const [scanned, setScanned] = useState(false);
    const [validating, setValidating] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);

    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Palette.orange} />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <View style={styles.permissionIcon}>
                        <Ionicons name="camera-outline" size={34} color="#FFFFFF" />
                    </View>
                    <Text style={styles.permissionTitle}>Acesso à câmera</Text>
                    <Text style={styles.permissionText}>
                        Precisamos da sua câmera para escanear os QR Codes dos participantes.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} accessibilityRole="button">
                        <Text style={styles.permissionButtonText}>Permitir câmera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backLink} onPress={onBack} accessibilityRole="button">
                        <Text style={styles.backLinkText}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    async function handleBarCodeScanned({ data }: { data: string }) {
        if (scanned || validating) return;
        setScanned(true);
        setValidating(true);

        try {
            const parsed = JSON.parse(data);

            if (!parsed.bookingId || !parsed.eventId) {
                setResult({ valid: false, message: 'QR Code inválido' });
                setValidating(false);
                return;
            }

            if (parsed.eventId !== eventId) {
                setResult({ valid: false, message: 'Este ingresso é de outro evento' });
                setValidating(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setResult({ valid: false, message: 'Sessão expirada' });
                setValidating(false);
                return;
            }

            const response = await registrationService.validateTicket(
                parsed.bookingId,
                session.user.id
            );

            setResult(response);
        } catch {
            setResult({ valid: false, message: 'QR Code inválido ou ilegível' });
        } finally {
            setValidating(false);
        }
    }

    function handleScanAgain() {
        setScanned(false);
        setResult(null);
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScannerHeader paddingTop={headerPaddingTop} onBack={onBack} />

            {!scanned ? (
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr'],
                        }}
                        onBarcodeScanned={handleBarCodeScanned}
                    >
                        <View style={styles.overlay}>
                            <View style={styles.scanFrame}>
                                <View style={[styles.corner, styles.cornerTopLeft]} />
                                <View style={[styles.corner, styles.cornerTopRight]} />
                                <View style={[styles.corner, styles.cornerBottomLeft]} />
                                <View style={[styles.corner, styles.cornerBottomRight]} />
                            </View>
                            <Text style={styles.scanHint}>Aponte para o QR Code do participante</Text>
                        </View>
                    </CameraView>
                </View>
            ) : (
                <View style={styles.resultContainer}>
                    {validating ? (
                        <View style={styles.validatingBox}>
                            <ActivityIndicator size="large" color={Palette.orange} />
                            <Text style={styles.validatingText}>Validando ingresso...</Text>
                        </View>
                    ) : result ? (
                        <View style={[
                            styles.resultCard,
                            result.valid ? styles.resultCardValid : styles.resultCardInvalid
                        ]}>
                            <View style={[
                                styles.resultIconCircle,
                                result.valid ? styles.iconCircleValid : styles.iconCircleInvalid
                            ]}>
                                <Ionicons
                                    name={result.valid ? 'checkmark' : 'close'}
                                    size={48}
                                    color="#FFFFFF"
                                />
                            </View>

                            <Text style={[
                                styles.resultTitle,
                                result.valid ? styles.resultTitleValid : styles.resultTitleInvalid
                            ]}>
                                {result.valid ? 'Ingresso válido!' : 'Ingresso inválido'}
                            </Text>

                            <Text style={styles.resultMessage}>{result.message}</Text>

                            {result.valid && result.booking?.user && (
                                <View style={styles.userInfo}>
                                    {result.booking.user.avatarUrl ? (
                                        <Image
                                            source={{ uri: result.booking.user.avatarUrl }}
                                            style={styles.userAvatar}
                                        />
                                    ) : (
                                        <View style={styles.userAvatarPlaceholder}>
                                            <Ionicons name="person" size={24} color={Palette.muted} />
                                        </View>
                                    )}
                                    <Text style={styles.userName}>{result.booking.user.fullName}</Text>
                                </View>
                            )}

                            <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain} accessibilityRole="button">
                                <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.scanAgainText}>Escanear outro</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>
            )}
        </SafeAreaView>
    );
}

export default function ScannerScreen() {
    const { id: eventId } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const normalizedEventId = Array.isArray(eventId) ? eventId[0] : eventId;

    if (!CameraView || !useCameraPermissions) {
        return (
            <SafeAreaView style={styles.container}>
                <ScannerHeader paddingTop={insets.top + 8} onBack={() => router.back()} />
                <View style={styles.centerContainer}>
                    <View style={styles.permissionIcon}>
                        <Ionicons name="camera-outline" size={34} color="#FFFFFF" />
                    </View>
                    <Text style={styles.permissionTitle}>Câmera indisponível</Text>
                    <Text style={styles.permissionText}>
                        O módulo de câmera não está disponível nesta versão do app. É necessário um novo build para usar o scanner.
                    </Text>
                    <TouchableOpacity style={styles.backLink} onPress={() => router.back()} accessibilityRole="button">
                        <Text style={styles.backLinkText}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <ScannerContent
            eventId={normalizedEventId}
            headerPaddingTop={insets.top + 8}
            onBack={() => router.back()}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.ink,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Palette.ink,
        paddingHorizontal: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
    },
    headerTitles: {
        flex: 1,
        gap: 2,
    },
    headerEyebrow: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.6,
        color: Palette.orange,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: '#FFFFFF',
    },
    permissionIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Palette.onBrandGlass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: Spacing.xl,
        marginBottom: Spacing.sm,
    },
    permissionText: {
        fontSize: 14,
        color: Palette.subtle,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: Spacing.xxl,
    },
    permissionButton: {
        backgroundColor: Palette.orange,
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxxl,
        borderRadius: BorderRadius.full,
    },
    permissionButtonText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 16,
    },
    backLink: {
        marginTop: Spacing.md,
        minHeight: 44,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
    },
    backLinkText: {
        color: Palette.subtle,
        fontSize: 15,
        fontWeight: '800',
    },
    cameraContainer: {
        flex: 1,
        overflow: 'hidden',
        borderTopLeftRadius: BorderRadius.sheet,
        borderTopRightRadius: BorderRadius.sheet,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scanFrame: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderColor: Palette.orange,
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderTopLeftRadius: BorderRadius.xl,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderTopRightRadius: BorderRadius.xl,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderBottomLeftRadius: BorderRadius.xl,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderBottomRightRadius: BorderRadius.xl,
    },
    scanHint: {
        color: '#FFFFFF',
        fontSize: 14,
        marginTop: Spacing.xxxl,
        fontWeight: '700',
        backgroundColor: Palette.scrim,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    validatingBox: {
        alignItems: 'center',
        gap: Spacing.lg,
    },
    validatingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    resultCard: {
        width: '100%',
        borderRadius: BorderRadius.sheet,
        padding: Spacing.xxl,
        alignItems: 'center',
        backgroundColor: Palette.surface,
        borderWidth: 2,
    },
    resultCardValid: {
        borderColor: Palette.green,
    },
    resultCardInvalid: {
        borderColor: Palette.danger,
    },
    resultIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    iconCircleValid: {
        backgroundColor: Palette.green,
    },
    iconCircleInvalid: {
        backgroundColor: Palette.danger,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: Spacing.sm,
    },
    resultTitleValid: {
        color: Palette.green,
    },
    resultTitleInvalid: {
        color: Palette.danger,
    },
    resultMessage: {
        fontSize: 14,
        color: Palette.inkSoft,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: Spacing.xxl,
    },
    userInfo: {
        alignItems: 'center',
        alignSelf: 'stretch',
        marginBottom: Spacing.xxl,
        padding: Spacing.lg,
        borderRadius: 22,
        backgroundColor: Palette.paper,
    },
    userAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: Spacing.sm,
        backgroundColor: Palette.track,
    },
    userAvatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Palette.track,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    userName: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
    },
    scanAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Palette.orange,
        minHeight: 48,
        paddingHorizontal: Spacing.xxl,
        borderRadius: BorderRadius.full,
        alignSelf: 'stretch',
    },
    scanAgainText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 15,
    },
});
