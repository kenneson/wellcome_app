import { registrationService } from '@/services/api/RegistrationService';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CheckoutData {
    paymentId: string;
    checkoutId: string;
    checkoutUrl: string;
    value: string;
    status: string;
    expiresInMinutes: number;
}

export default function PaymentScreen() {
    const { id, bookingId } = useLocalSearchParams<{ id: string; bookingId: string }>();
    const router = useRouter();
    const [checkout, setCheckout] = useState<CheckoutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [opening, setOpening] = useState(false);
    const [checking, setChecking] = useState(false);
    const [paid, setPaid] = useState(false);
    const [expired, setExpired] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const checkPaymentStatus = useCallback(async (showFeedback = false) => {
        if (!bookingId) return;

        if (showFeedback) setChecking(true);
        try {
            const result = await registrationService.checkPayment(String(bookingId));
            if (result.paid) {
                stopPolling();
                setPaid(true);
                setExpired(false);
                return;
            }

            if (result.status === 'EXPIRED') {
                stopPolling();
                setExpired(true);
                return;
            }

            if (showFeedback) {
                Alert.alert('Aguardando pagamento', 'A confirmacao ainda nao chegou. Tente novamente em alguns instantes.');
            }
        } catch (error: any) {
            if (showFeedback) {
                Alert.alert('Erro', error.message || 'Falha ao consultar o pagamento.');
            }
        } finally {
            if (showFeedback) setChecking(false);
        }
    }, [bookingId, stopPolling]);

    const startPolling = useCallback(() => {
        stopPolling();
        pollRef.current = setInterval(() => {
            void checkPaymentStatus(false);
        }, 4000);
    }, [checkPaymentStatus, stopPolling]);

    const createCheckout = useCallback(async () => {
        if (!id || !bookingId) return;

        setLoading(true);
        setExpired(false);
        try {
            const result = await registrationService.createPaymentCheckout({
                bookingId: String(bookingId),
                eventId: String(id),
            });
            setCheckout(result);
            startPolling();
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Nao foi possivel iniciar o pagamento.', [
                { text: 'Voltar', onPress: () => router.back() },
            ]);
        } finally {
            setLoading(false);
        }
    }, [bookingId, id, router, startPolling]);

    useEffect(() => {
        void createCheckout();
        return stopPolling;
    }, [createCheckout, stopPolling]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') void checkPaymentStatus(false);
        });
        return () => subscription.remove();
    }, [checkPaymentStatus]);

    const handleOpenCheckout = async () => {
        if (!checkout?.checkoutUrl) return;

        setOpening(true);
        try {
            await WebBrowser.openBrowserAsync(checkout.checkoutUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
                controlsColor: '#FF8C42',
            });
            await checkPaymentStatus(false);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Nao foi possivel abrir o pagamento.');
        } finally {
            setOpening(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#FF8C42" />
                    <Text style={styles.loadingText}>Preparando pagamento...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (paid) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <Ionicons name="checkmark-circle" size={80} color="#16855B" />
                    <Text style={styles.successTitle}>Pagamento confirmado</Text>
                    <Text style={styles.successSubtitle}>Sua inscricao no evento esta confirmada.</Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace(`/events/${id}`)}>
                        <Text style={styles.primaryButtonText}>Voltar ao evento</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} accessibilityLabel="Voltar">
                    <Ionicons name="arrow-back" size={24} color="#202124" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pagamento</Text>
                <View style={styles.iconButton} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>Valor do ingresso</Text>
                    <Text style={styles.amountValue}>
                        R$ {Number(checkout?.value || 0).toFixed(2).replace('.', ',')}
                    </Text>
                </View>

                <View style={styles.methodRow}>
                    <View style={styles.methodIcon}>
                        <Ionicons name="qr-code-outline" size={24} color="#187A67" />
                    </View>
                    <View style={styles.methodText}>
                        <Text style={styles.methodTitle}>Pix</Text>
                        <Text style={styles.methodSubtitle}>Confirmacao rapida pelo seu banco</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.methodRow}>
                    <View style={styles.methodIcon}>
                        <Ionicons name="card-outline" size={24} color="#315E9E" />
                    </View>
                    <View style={styles.methodText}>
                        <Text style={styles.methodTitle}>Cartao de credito</Text>
                        <Text style={styles.methodSubtitle}>Pagamento a vista</Text>
                    </View>
                </View>

                {expired ? (
                    <View style={styles.statusBlock}>
                        <Ionicons name="time-outline" size={22} color="#9A5B15" />
                        <Text style={styles.statusText}>Este checkout expirou.</Text>
                        <TouchableOpacity style={styles.primaryButton} onPress={() => void createCheckout()}>
                            <Ionicons name="refresh" size={20} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>Gerar novo pagamento</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity
                            style={[styles.primaryButton, opening && styles.disabledButton]}
                            onPress={handleOpenCheckout}
                            disabled={opening}
                        >
                            {opening ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.primaryButtonText}>Abrir pagamento</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, checking && styles.disabledButton]}
                            onPress={() => void checkPaymentStatus(true)}
                            disabled={checking}
                        >
                            {checking ? (
                                <ActivityIndicator color="#FF8C42" />
                            ) : (
                                <>
                                    <Ionicons name="refresh" size={20} color="#FF8C42" />
                                    <Text style={styles.secondaryButtonText}>Verificar pagamento</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.securityRow}>
                    <Ionicons name="lock-closed-outline" size={17} color="#6D7278" />
                    <Text style={styles.securityText}>Pagamento processado em ambiente seguro pelo Asaas.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14 },
    loadingText: { fontSize: 15, color: '#666B70' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E3E5E8',
    },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#202124' },
    content: { padding: 24, paddingBottom: 40 },
    amountBlock: { alignItems: 'center', marginBottom: 34 },
    amountLabel: { fontSize: 14, color: '#72777D', marginBottom: 6 },
    amountValue: { fontSize: 34, fontWeight: '800', color: '#202124' },
    methodRow: { flexDirection: 'row', alignItems: 'center', minHeight: 68 },
    methodIcon: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: '#F3F5F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    methodText: { flex: 1 },
    methodTitle: { fontSize: 16, fontWeight: '700', color: '#202124' },
    methodSubtitle: { fontSize: 13, color: '#72777D', marginTop: 3 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E3E5E8', marginLeft: 58 },
    primaryButton: {
        minHeight: 52,
        borderRadius: 8,
        backgroundColor: '#FF8C42',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 20,
        marginTop: 30,
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    secondaryButton: {
        minHeight: 50,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF8C42',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 20,
        marginTop: 12,
    },
    secondaryButtonText: { color: '#C86529', fontSize: 15, fontWeight: '700' },
    disabledButton: { opacity: 0.65 },
    securityRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 24 },
    securityText: { flexShrink: 1, fontSize: 12, color: '#6D7278', textAlign: 'center' },
    statusBlock: { alignItems: 'center', marginTop: 30 },
    statusText: { color: '#79501F', marginTop: 8 },
    successTitle: { fontSize: 24, fontWeight: '800', color: '#202124' },
    successSubtitle: { fontSize: 16, color: '#666B70', textAlign: 'center', marginBottom: 8 },
});
