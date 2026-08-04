import { eventService } from '@/services/api/EventService';
import { BillingWallet, PixPaymentResult, paymentService } from '@/services/api/PaymentService';
import { registrationService } from '@/services/api/RegistrationService';
import { displayCardBrand } from '@/shared/lib/paymentValidation';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

type PaymentMethod = 'pix' | 'card';

export default function PaymentScreen() {
    const { id, bookingId } = useLocalSearchParams<{ id: string; bookingId: string }>();
    const router = useRouter();
    const [wallet, setWallet] = useState<BillingWallet | null>(null);
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState<PaymentMethod>('pix');
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [pix, setPix] = useState<PixPaymentResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [checking, setChecking] = useState(false);
    const [paid, setPaid] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    }, []);

    const checkPaymentStatus = useCallback(async (showFeedback = false) => {
        if (!bookingId) return;
        if (showFeedback) setChecking(true);
        try {
            const result = await registrationService.checkPayment(String(bookingId));
            if (result.paid) {
                stopPolling();
                setPaid(true);
                return;
            }
            if (showFeedback) {
                const refused = String(result.providerStatus || '').includes('REFUSED');
                Alert.alert(
                    refused ? 'Pagamento recusado' : 'Aguardando pagamento',
                    refused
                        ? 'Revise o cartao ou escolha outro metodo de pagamento.'
                        : 'A confirmacao ainda nao chegou. Tente novamente em alguns instantes.'
                );
            }
        } catch (error: any) {
            if (showFeedback && !String(error.message).includes('not found')) {
                Alert.alert('Erro', error.message || 'Falha ao consultar o pagamento.');
            }
        } finally {
            if (showFeedback) setChecking(false);
        }
    }, [bookingId, stopPolling]);

    const startPolling = useCallback(() => {
        stopPolling();
        pollRef.current = setInterval(() => void checkPaymentStatus(false), 4000);
    }, [checkPaymentStatus, stopPolling]);

    const loadScreen = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [billingWallet, event] = await Promise.all([
                paymentService.getWallet(),
                eventService.getEventById(String(id)),
            ]);
            setWallet(billingWallet);
            setAmount(Number(event.price || 0));
            setSelectedCardId((current) => {
                if (current && billingWallet.cards.some((card) => card.id === current)) return current;
                return billingWallet.cards.find((card) => card.isDefault)?.id || billingWallet.cards[0]?.id || null;
            });
            await checkPaymentStatus(false);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Nao foi possivel preparar o pagamento.');
        } finally {
            setLoading(false);
        }
    }, [checkPaymentStatus, id]);

    useFocusEffect(useCallback(() => {
        void loadScreen();
        return stopPolling;
    }, [loadScreen, stopPolling]));

    useEffect(() => {
        if (!pix?.expirationDate) return;
        const updateRemaining = () => {
            const seconds = Math.max(0, Math.floor((new Date(pix.expirationDate).getTime() - Date.now()) / 1000));
            setRemainingSeconds(seconds);
        };
        updateRemaining();
        const timer = setInterval(updateRemaining, 1000);
        return () => clearInterval(timer);
    }, [pix?.expirationDate]);

    const openBillingProfile = (targetMethod: PaymentMethod) => {
        router.push({
            pathname: '/profile/payments',
            params: { eventId: String(id), bookingId: String(bookingId), mode: targetMethod },
        } as any);
    };

    const openAddCard = () => {
        if (!wallet?.cardReady) {
            openBillingProfile('card');
            return;
        }
        router.push({
            pathname: '/profile/payments/card',
            params: { eventId: String(id), bookingId: String(bookingId) },
        } as any);
    };

    const generatePix = async () => {
        if (!id || !bookingId) return;
        if (!wallet?.pixReady) {
            openBillingProfile('pix');
            return;
        }
        setProcessing(true);
        try {
            const result = await paymentService.createPixPayment(String(bookingId), String(id));
            setPix(result);
            if (result.paid) setPaid(true);
            else startPolling();
        } catch (error: any) {
            Alert.alert('Nao foi possivel gerar o Pix', error.message);
        } finally {
            setProcessing(false);
        }
    };

    const payWithCard = async () => {
        if (!id || !bookingId) return;
        if (!wallet?.cardReady) {
            openBillingProfile('card');
            return;
        }
        if (!selectedCardId) {
            openAddCard();
            return;
        }
        setProcessing(true);
        try {
            const result = await paymentService.payWithCard(String(bookingId), String(id), selectedCardId);
            if (result.paid) setPaid(true);
            else {
                startPolling();
                Alert.alert('Pagamento em analise', 'Avisaremos assim que o cartao for confirmado.');
            }
        } catch (error: any) {
            Alert.alert('Pagamento nao aprovado', error.message || 'Tente outro cartao ou pague com Pix.');
        } finally {
            setProcessing(false);
        }
    };

    const copyPix = async () => {
        if (!pix?.pixCopyPaste) return;
        await Clipboard.setStringAsync(pix.pixCopyPaste);
        Alert.alert('Pix copiado', 'Cole o codigo no aplicativo do seu banco.');
    };

    const formatRemaining = () => {
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        return hours > 0
            ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#E56F2D" />
                    <Text style={styles.mutedText}>Preparando pagamento...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (paid) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centered}>
                    <Ionicons name="checkmark-circle" size={76} color="#16855B" />
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
                <TouchableOpacity
                    onPress={() => openBillingProfile(method)}
                    style={styles.iconButton}
                    accessibilityLabel="Gerenciar pagamentos"
                >
                    <Ionicons name="wallet-outline" size={23} color="#202124" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>Valor do ingresso</Text>
                    <Text style={styles.amountValue}>
                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Text>
                </View>

                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        style={[styles.segment, method === 'pix' && styles.activeSegment]}
                        onPress={() => setMethod('pix')}
                    >
                        <Ionicons name="qr-code-outline" size={20} color={method === 'pix' ? '#FFFFFF' : '#187A67'} />
                        <Text style={[styles.segmentText, method === 'pix' && styles.activeSegmentText]}>Pix</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segment, method === 'card' && styles.activeSegment]}
                        onPress={() => setMethod('card')}
                    >
                        <Ionicons name="card-outline" size={20} color={method === 'card' ? '#FFFFFF' : '#315E9E'} />
                        <Text style={[styles.segmentText, method === 'card' && styles.activeSegmentText]}>Cartao</Text>
                    </TouchableOpacity>
                </View>

                {method === 'pix' ? (
                    <View style={styles.methodContent}>
                        {pix ? (
                            <>
                                {pix.environment === 'sandbox' && (
                                    <View style={styles.sandboxBanner}>
                                        <Ionicons name="flask-outline" size={19} color="#87540B" />
                                        <Text style={styles.sandboxText}>Teste: confirme esta cobranca no painel Sandbox do Asaas.</Text>
                                    </View>
                                )}
                                {pix.awaitingSettlement ? (
                                    <View style={styles.reviewBlock}>
                                        <Ionicons name="time-outline" size={40} color="#A66B00" />
                                        <Text style={styles.reviewTitle}>Pagamento em analise</Text>
                                        <Text style={styles.reviewText}>
                                            O Asaas confirmou o Pix, mas a liquidacao ainda esta em analise. A inscricao sera liberada automaticamente.
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.qrArea}>
                                            <QRCode value={pix.pixCopyPaste} size={214} quietZone={8} />
                                        </View>
                                        <Text style={styles.expirationLabel}>Expira em {formatRemaining()}</Text>
                                        <TouchableOpacity style={styles.primaryButton} onPress={copyPix}>
                                            <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                                            <Text style={styles.primaryButtonText}>Copiar codigo Pix</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => void checkPaymentStatus(true)}
                                    disabled={checking}
                                >
                                    {checking ? <ActivityIndicator color="#C45D22" /> : (
                                        <>
                                            <Ionicons name="refresh" size={20} color="#C45D22" />
                                            <Text style={styles.secondaryButtonText}>Verificar pagamento</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : wallet?.pixReady ? (
                            <>
                                <View style={styles.methodIntro}>
                                    <Ionicons name="flash-outline" size={24} color="#187A67" />
                                    <View style={styles.flexText}>
                                        <Text style={styles.methodTitle}>Pagamento instantaneo</Text>
                                        <Text style={styles.methodSubtitle}>O QR Code aparecera aqui, sem sair do Wellcome.</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.primaryButton} onPress={generatePix} disabled={processing}>
                                    {processing ? <ActivityIndicator color="#FFFFFF" /> : (
                                        <Text style={styles.primaryButtonText}>Gerar Pix</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <MissingProfile onPress={() => openBillingProfile('pix')} card={false} />
                        )}
                    </View>
                ) : (
                    <View style={styles.methodContent}>
                        {!wallet?.cardReady ? (
                            <MissingProfile onPress={() => openBillingProfile('card')} card />
                        ) : (
                            <>
                                {wallet.cards.map((card) => {
                                    const selected = selectedCardId === card.id;
                                    return (
                                        <TouchableOpacity
                                            key={card.id}
                                            style={[styles.cardRow, selected && styles.selectedCardRow]}
                                            onPress={() => setSelectedCardId(card.id)}
                                        >
                                            <View style={styles.cardIcon}>
                                                <Ionicons name="card" size={22} color="#315E9E" />
                                            </View>
                                            <View style={styles.flexText}>
                                                <Text style={styles.cardTitle}>{displayCardBrand(card.brand)} final {card.lastFour}</Text>
                                                <Text style={styles.cardSubtitle}>Validade {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}</Text>
                                            </View>
                                            <Ionicons
                                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                                size={22}
                                                color={selected ? '#E56F2D' : '#A7ABB0'}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}

                                <TouchableOpacity style={styles.addCardButton} onPress={openAddCard}>
                                    <Ionicons name="add-circle-outline" size={21} color="#315E9E" />
                                    <Text style={styles.addCardText}>Adicionar cartao</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.primaryButton, processing && styles.disabledButton]}
                                    onPress={payWithCard}
                                    disabled={processing}
                                >
                                    {processing ? <ActivityIndicator color="#FFFFFF" /> : (
                                        <>
                                            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                                            <Text style={styles.primaryButtonText}>
                                                Pagar R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                <View style={styles.securityRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#5E646A" />
                    <Text style={styles.securityText}>Dados protegidos e processados pelo Asaas.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function MissingProfile({ onPress, card }: { onPress: () => void; card: boolean }) {
    return (
        <View style={styles.missingBlock}>
            <Ionicons name="person-circle-outline" size={34} color="#E56F2D" />
            <Text style={styles.missingTitle}>Complete seus dados de cobranca</Text>
            <Text style={styles.missingText}>
                {card
                    ? 'Cadastre CPF e endereco uma vez para usar cartoes com mais rapidez.'
                    : 'Precisamos do seu CPF e contato para identificar a cobranca.'}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={onPress}>
                <Text style={styles.primaryButtonText}>Completar dados</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E2E4E7',
    },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#202124' },
    content: { padding: 20, paddingBottom: 40 },
    amountBlock: { alignItems: 'center', marginVertical: 14, marginBottom: 24 },
    amountLabel: { fontSize: 14, color: '#6D7278', marginBottom: 5 },
    amountValue: { fontSize: 34, fontWeight: '800', color: '#202124' },
    segmentedControl: {
        height: 48, flexDirection: 'row', backgroundColor: '#F0F2F4', borderRadius: 8, padding: 4,
    },
    segment: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 6,
    },
    activeSegment: { backgroundColor: '#30343A' },
    segmentText: { fontSize: 15, fontWeight: '700', color: '#454A50' },
    activeSegmentText: { color: '#FFFFFF' },
    methodContent: { marginTop: 24 },
    methodIntro: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
    methodTitle: { fontSize: 17, fontWeight: '700', color: '#202124' },
    methodSubtitle: { fontSize: 14, lineHeight: 20, color: '#6D7278', marginTop: 3 },
    flexText: { flex: 1 },
    primaryButton: {
        minHeight: 52, borderRadius: 8, backgroundColor: '#E56F2D', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, marginTop: 22,
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    secondaryButton: {
        minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: '#D66A2C', flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18, marginTop: 12,
    },
    secondaryButtonText: { color: '#C45D22', fontSize: 15, fontWeight: '700' },
    disabledButton: { opacity: 0.6 },
    sandboxBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF5D8',
        borderRadius: 8, padding: 12, marginBottom: 18,
    },
    sandboxText: { flex: 1, color: '#704709', fontSize: 13, lineHeight: 18 },
    qrArea: { alignItems: 'center', paddingVertical: 12 },
    expirationLabel: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#5E646A', marginTop: 8 },
    reviewBlock: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12 },
    reviewTitle: { marginTop: 10, fontSize: 18, fontWeight: '800', color: '#202124' },
    reviewText: { marginTop: 7, maxWidth: 330, textAlign: 'center', fontSize: 14, lineHeight: 20, color: '#666B70' },
    cardRow: {
        minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1,
        borderColor: '#E0E3E6', borderRadius: 8, paddingHorizontal: 14, marginBottom: 10,
    },
    selectedCardRow: { borderColor: '#E56F2D', backgroundColor: '#FFF8F3' },
    cardIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EDF3FB', alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#202124' },
    cardSubtitle: { fontSize: 13, color: '#747980', marginTop: 3 },
    addCardButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addCardText: { color: '#315E9E', fontSize: 15, fontWeight: '700' },
    missingBlock: { alignItems: 'center', paddingVertical: 18 },
    missingTitle: { marginTop: 10, fontSize: 18, fontWeight: '700', color: '#202124', textAlign: 'center' },
    missingText: { marginTop: 7, color: '#6D7278', textAlign: 'center', lineHeight: 20, maxWidth: 320 },
    securityRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 26 },
    securityText: { flexShrink: 1, fontSize: 12, color: '#5E646A', textAlign: 'center' },
    mutedText: { fontSize: 15, color: '#666B70' },
    successTitle: { fontSize: 24, fontWeight: '800', color: '#202124' },
    successSubtitle: { fontSize: 16, color: '#666B70', textAlign: 'center' },
});
