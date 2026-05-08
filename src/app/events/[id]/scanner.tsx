import { registrationService } from '@/services/api/RegistrationService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
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
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Ionicons name="camera-outline" size={64} color="#CCC" />
                    <Text style={styles.permissionTitle}>Acesso a Camera</Text>
                    <Text style={styles.permissionText}>
                        Precisamos da sua camera para escanear os QR Codes dos participantes.
                    </Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>Permitir Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backLink} onPress={onBack}>
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
                setResult({ valid: false, message: 'QR Code invalido' });
                setValidating(false);
                return;
            }

            if (parsed.eventId !== eventId) {
                setResult({ valid: false, message: 'Este ingresso e de outro evento' });
                setValidating(false);
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setResult({ valid: false, message: 'Sessao expirada' });
                setValidating(false);
                return;
            }

            const response = await registrationService.validateTicket(
                parsed.bookingId
            );

            setResult(response);
        } catch {
            setResult({ valid: false, message: 'QR Code invalido ou ilegivel' });
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
            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Escanear Ingresso</Text>
                <View style={{ width: 40 }} />
            </View>

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
                            <ActivityIndicator size="large" color="#FF8C42" />
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
                                    color="#fff"
                                />
                            </View>

                            <Text style={[
                                styles.resultTitle,
                                result.valid ? styles.resultTitleValid : styles.resultTitleInvalid
                            ]}>
                                {result.valid ? 'Ingresso Valido!' : 'Ingresso Invalido'}
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
                                            <Ionicons name="person" size={24} color="#fff" />
                                        </View>
                                    )}
                                    <Text style={styles.userName}>{result.booking.user.fullName}</Text>
                                </View>
                            )}

                            <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
                                <Ionicons name="scan-outline" size={20} color="#fff" />
                                <Text style={styles.scanAgainText}>Escanear Outro</Text>
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
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Escanear Ingresso</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.centerContainer}>
                    <Ionicons name="camera-outline" size={64} color="#CCC" />
                    <Text style={styles.permissionTitle}>Camera Indisponivel</Text>
                    <Text style={styles.permissionText}>
                        O modulo de camera nao esta disponivel nesta versao do app. E necessario um novo build para usar o scanner.
                    </Text>
                    <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
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
        backgroundColor: '#1A1A1A',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    permissionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginTop: 20,
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    permissionButton: {
        backgroundColor: '#FF8C42',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
    },
    permissionButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    backLink: {
        marginTop: 16,
    },
    backLinkText: {
        color: '#888',
        fontSize: 14,
    },
    cameraContainer: {
        flex: 1,
        overflow: 'hidden',
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
        width: 30,
        height: 30,
        borderColor: '#FF8C42',
    },
    cornerTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 8,
    },
    cornerTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 8,
    },
    cornerBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 8,
    },
    cornerBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 8,
    },
    scanHint: {
        color: '#fff',
        fontSize: 14,
        marginTop: 32,
        fontWeight: '500',
    },
    resultContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    validatingBox: {
        alignItems: 'center',
        gap: 16,
    },
    validatingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    resultCard: {
        width: '100%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    resultCardValid: {
        backgroundColor: '#F0FDF4',
    },
    resultCardInvalid: {
        backgroundColor: '#FEF2F2',
    },
    resultIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircleValid: {
        backgroundColor: '#10B981',
    },
    iconCircleInvalid: {
        backgroundColor: '#EF4444',
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 8,
    },
    resultTitleValid: {
        color: '#10B981',
    },
    resultTitleInvalid: {
        color: '#EF4444',
    },
    resultMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    userInfo: {
        alignItems: 'center',
        marginBottom: 24,
    },
    userAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 8,
    },
    userAvatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#CCC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    scanAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FF8C42',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 16,
    },
    scanAgainText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});
