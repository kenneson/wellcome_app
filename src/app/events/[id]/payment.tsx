import { registrationService } from '@/services/api/RegistrationService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PixData {
    paymentId: string;
    txid: string;
    qrcode: string;         // base64 image
    pixCopiaECola: string;
    valor: string;
    status: string;
}

export default function PaymentScreen() {
    const { id, bookingId } = useLocalSearchParams<{ id: string; bookingId: string }>();
    const router = useRouter();
    const [pixData, setPixData] = useState<PixData | null>(null);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [paid, setPaid] = useState(false);
    const [copied, setCopied] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (id && bookingId) {
            generatePixCharge();
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [id, bookingId]);

    const generatePixCharge = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Erro', 'Sessão expirada. Faça login novamente.');
                router.back();
                return;
            }

            const result = await registrationService.createPixCharge({
                bookingId: bookingId as string,
                eventId: id as string,
            });

            setPixData(result);
            startPolling();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao gerar QR Code PIX.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const startPolling = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);

        pollRef.current = setInterval(async () => {
            try {
                const result = await registrationService.checkPixPayment(bookingId as string);
                if (result.paid) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setPaid(true);
                }
            } catch {
                // Silently ignore polling errors
            }
        }, 5000); // Verifica a cada 5 segundos
    }, [bookingId]);

    const handleCheckPayment = async () => {
        setChecking(true);
        try {
            const result = await registrationService.checkPixPayment(bookingId as string);
            if (result.paid) {
                setPaid(true);
                if (pollRef.current) clearInterval(pollRef.current);
            } else {
                Alert.alert('Aguardando', 'Pagamento ainda não confirmado. Tente novamente em alguns instantes.');
            }
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Falha ao verificar pagamento.');
        } finally {
            setChecking(false);
        }
    };

    const handleCopyCode = async () => {
        if (!pixData?.pixCopiaECola) return;
        await Clipboard.setStringAsync(pixData.pixCopiaECola);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleGoToEvent = () => {
        router.replace(`/events/${id}`);
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF8C42" />
                    <Text style={styles.loadingText}>Gerando QR Code PIX...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (paid) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                    </View>
                    <Text style={styles.successTitle}>Pagamento Confirmado!</Text>
                    <Text style={styles.successSubtitle}>
                        Sua inscrição foi confirmada com sucesso.
                    </Text>
                    <TouchableOpacity style={styles.successButton} onPress={handleGoToEvent}>
                        <Text style={styles.successButtonText}>Voltar ao Evento</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pagamento PIX</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {pixData && (
                    <>
                        <View style={styles.amountContainer}>
                            <Text style={styles.amountLabel}>Valor a pagar</Text>
                            <Text style={styles.amountValue}>
                                R$ {Number(pixData.valor).toFixed(2).replace('.', ',')}
                            </Text>
                        </View>

                        <View style={styles.qrcodeContainer}>
                            <Text style={styles.qrcodeTitle}>
                                Escaneie o QR Code com o app do seu banco
                            </Text>
                            {pixData.qrcode ? (
                                <Image
                                    source={{ uri: pixData.qrcode }}
                                    style={styles.qrcodeImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.qrcodePlaceholder}>
                                    <Ionicons name="qr-code-outline" size={120} color="#ccc" />
                                </View>
                            )}
                        </View>

                        <Text style={styles.orText}>ou copie o código PIX</Text>

                        <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                            <Ionicons
                                name={copied ? 'checkmark-circle' : 'copy-outline'}
                                size={20}
                                color={copied ? '#4CAF50' : '#FF8C42'}
                            />
                            <Text style={[styles.copyButtonText, copied && { color: '#4CAF50' }]}>
                                {copied ? 'Código copiado!' : 'Copiar código Pix Copia e Cola'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.infoBox}>
                            <Ionicons name="time-outline" size={18} color="#666" />
                            <Text style={styles.infoText}>
                                O QR Code expira em 1 hora. Após o pagamento, a confirmação é automática.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.checkButton, checking && styles.checkButtonDisabled]}
                            onPress={handleCheckPayment}
                            disabled={checking}
                        >
                            {checking ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="refresh" size={20} color="#fff" />
                                    <Text style={styles.checkButtonText}>Já paguei, verificar</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    amountContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    amountLabel: {
        fontSize: 14,
        color: '#888',
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#222',
    },
    qrcodeContainer: {
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        marginBottom: 16,
    },
    qrcodeTitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    qrcodeImage: {
        width: 250,
        height: 250,
    },
    qrcodePlaceholder: {
        width: 250,
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 12,
    },
    orText: {
        fontSize: 13,
        color: '#999',
        marginVertical: 12,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: '#FF8C42',
        borderRadius: 12,
        marginBottom: 20,
    },
    copyButtonText: {
        fontSize: 14,
        color: '#FF8C42',
        fontWeight: '600',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#FFF8F0',
        padding: 14,
        borderRadius: 10,
        marginBottom: 24,
        width: '100%',
    },
    infoText: {
        fontSize: 13,
        color: '#666',
        flex: 1,
        lineHeight: 18,
    },
    checkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 14,
        width: '100%',
    },
    checkButtonDisabled: {
        opacity: 0.7,
    },
    checkButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    successIcon: {
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
    },
    successButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 14,
    },
    successButtonText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },
});
