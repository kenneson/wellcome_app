import { registrationFlow } from '@/shared/lib/registrationFlow';
import { eventService } from '@/services/api/EventService';
import { BillingWallet, PixPaymentResult, paymentService } from '@/services/api/PaymentService';
import { registrationService } from '@/services/api/RegistrationService';
import { displayCardBrand } from '@/shared/lib/paymentValidation';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader, HeaderIconButton } from '@/components/ui/wellcome';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PaymentMethod = 'pix' | 'card';

export default function PaymentScreen() {
    const { id, bookingId } = useLocalSearchParams<{ id: string; bookingId: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [wallet, setWallet] = useState<BillingWallet | null>(null);
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState<PaymentMethod>('pix');
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [pix, setPix] = useState<PixPaymentResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [checking, setChecking] = useState(false);
    const [paid, setPaid] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
    const [requiresHostApproval, setRequiresHostApproval] = useState(false);
    const [bookingApproved, setBookingApproved] = useState(false);
    const [bookingExpired, setBookingExpired] = useState(false);
    const [bookingStatus, setBookingStatus] = useState<string | null>(null);
    const [paymentDueAt, setPaymentDueAt] = useState<string | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
    }, []);

    const confirmPaymentAndRefreshApproval = useCallback(async () => {
        if (id && bookingId) {
            try {
                const event = await eventService.getEventById(String(id));
                const currentBooking = event.bookings?.find(
                    (booking) => booking.id === String(bookingId)
                );
                setBookingApproved(currentBooking?.status === 'APPROVED');
                setBookingStatus(currentBooking?.status || null);
            } catch {
                // Payment confirmation is still valid if refreshing the approval status fails.
            }
        }
        setPaid(true);
    }, [bookingId, id]);

    const checkPaymentStatus = useCallback(async (showFeedback = false) => {
        if (!bookingId) return;
        if (showFeedback) setChecking(true);
        try {
            const result = await registrationService.checkPayment(String(bookingId));
            setPaymentStatus(result.status);
            setPaid(Boolean(result.paid));
            if (result.paid) {
                stopPolling();
                await confirmPaymentAndRefreshApproval();
                return;
            }
            if (showFeedback) {
                const refused = String(result.providerStatus || '').includes('REFUSED');
                Alert.alert(
                    refused ? 'Pagamento recusado' : 'Aguardando pagamento',
                    refused
                        ? 'Revise o cartão ou escolha outro método de pagamento.'
                        : 'A confirmação ainda não chegou. Tente novamente em alguns instantes.'
                );
            }
        } catch (error: any) {
            if (showFeedback && !String(error.message).includes('not found')) {
                Alert.alert('Erro', error.message || 'Falha ao consultar o pagamento.');
            }
        } finally {
            if (showFeedback) setChecking(false);
        }
    }, [bookingId, confirmPaymentAndRefreshApproval, stopPolling]);

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
            setRequiresHostApproval(
                event.requiresApproval === true || event.accessType === 'OPEN_WITH_APPROVAL'
            );
            const currentBooking = event.bookings?.find(
                (booking) => booking.id === String(bookingId)
            );
            setBookingApproved(currentBooking?.status === 'APPROVED');
            setBookingExpired(currentBooking?.status === 'EXPIRED');
            setBookingStatus(currentBooking?.status || null);
            setPaymentDueAt(currentBooking?.paymentDueAt || null);
            setSelectedCardId((current) => {
                if (current && billingWallet.cards.some((card) => card.id === current)) return current;
                return billingWallet.cards.find((card) => card.isDefault)?.id || billingWallet.cards[0]?.id || null;
            });
            await checkPaymentStatus(false);
        } catch (error: any) {
            Alert.alert('Erro', error.message || 'Não foi possível preparar o pagamento.');
        } finally {
            setLoading(false);
        }
    }, [bookingId, checkPaymentStatus, id]);

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
            if (result.paid) await confirmPaymentAndRefreshApproval();
            else startPolling();
        } catch (error: any) {
            Alert.alert('Não foi possível gerar o Pix', error.message);
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
            if (result.paid) await confirmPaymentAndRefreshApproval();
            else {
                startPolling();
                Alert.alert('Pagamento em análise', 'Avisaremos assim que o cartão for confirmado.');
            }
        } catch (error: any) {
            Alert.alert('Pagamento não aprovado', error.message || 'Tente outro cartão ou pague com Pix.');
        } finally {
            setProcessing(false);
        }
    };

    const copyPix = async () => {
        if (!pix?.pixCopyPaste) return;
        await Clipboard.setStringAsync(pix.pixCopyPaste);
        Alert.alert('Pix copiado', 'Cole o código no aplicativo do seu banco.');
    };

    const formatRemaining = () => {
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;
        return hours > 0
            ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const paymentWindowExpired = Boolean(
        bookingExpired
        // eslint-disable-next-line react-hooks/purity -- deadline is re-checked on every render by design
        || (paymentDueAt && new Date(paymentDueAt).getTime() <= Date.now() && !paid)
    );

    const backToEvent = () => router.replace(`/events/${id}`);
    const formattedAmount = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    if (loading) {
        return (
            <PaymentShell>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Palette.orange} />
                    <Text style={styles.mutedText}>Preparando pagamento...</Text>
                </View>
            </PaymentShell>
        );
    }

    if (bookingStatus === 'WAITLIST') {
        return (
            <PaymentShell>
                <StatusState
                    icon="people-outline"
                    color={Palette.blue}
                    background={Palette.blueSoft}
                    title="Você está na lista de espera"
                    body="Nenhum pagamento é necessário agora. Avisaremos quando uma vaga for liberada."
                    onBack={backToEvent}
                />
            </PaymentShell>
        );
    }

    if (!bookingStatus || ['REJECTED', 'CANCELLED'].includes(bookingStatus) || ['REFUNDED', 'CHARGEBACK'].includes(paymentStatus || '')) {
        const flow = registrationFlow({ status: bookingStatus, paymentStatus }, amount > 0, requiresHostApproval);
        return (
            <PaymentShell>
                <StatusState
                    icon="hourglass-outline"
                    color={Palette.orangeDeep}
                    background={Palette.orangeSoft}
                    title={bookingStatus ? flow.label : 'Inscrição indisponível'}
                    body={bookingStatus ? flow.description : 'Volte ao evento para iniciar uma inscrição.'}
                    onBack={backToEvent}
                />
            </PaymentShell>
        );
    }

    if (paymentWindowExpired) {
        return (
            <PaymentShell>
                <StatusState
                    icon="alert-circle-outline"
                    color={Palette.danger}
                    background={Palette.dangerLine}
                    title="Prazo de pagamento encerrado"
                    body={paid ? 'Sua inscrição expirou. O pagamento recebido será devolvido integralmente.' : 'O prazo desta inscrição terminou. Volte ao evento para consultar sua situação.'}
                    onBack={backToEvent}
                />
            </PaymentShell>
        );
    }

    if (paid) {
        return (
            <PaymentShell>
                <StatusState
                    icon="checkmark-circle"
                    color={Palette.green}
                    background={Palette.greenSoft}
                    title="Pagamento confirmado"
                    body={requiresHostApproval && !bookingApproved
                        ? 'Seu pagamento foi recebido e a vaga está reservada. Aguarde a aprovação do anfitrião para receber o ingresso.'
                        : 'Pagamento e aprovação concluídos. Sua participação no evento está confirmada.'}
                    onBack={backToEvent}
                >
                    {requiresHostApproval && !bookingApproved && (
                        <View style={styles.refundNotice}>
                            <Ionicons name="return-down-back-outline" size={20} color={Palette.orangeDeep} />
                            <Text style={styles.refundNoticeText}>
                                Se o anfitrião não aceitar sua solicitação, o valor será reembolsado.
                            </Text>
                        </View>
                    )}
                </StatusState>
            </PaymentShell>
        );
    }

    return (
        <PaymentShell
            actions={(
                <HeaderIconButton
                    icon="wallet-outline"
                    accessibilityLabel="Gerenciar pagamentos"
                    onPress={() => openBillingProfile(method)}
                />
            )}
        >
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxxl }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.amountBlock}>
                    <Text style={styles.amountLabel}>VALOR DO INGRESSO</Text>
                    <Text style={styles.amountValue}>R$ {formattedAmount}</Text>
                </View>

                {requiresHostApproval && (
                    <View style={styles.approvalNotice}>
                        <View style={styles.approvalNoticeHeader}>
                            <Ionicons name="information-circle" size={22} color={Palette.orangeDeep} />
                            <Text style={styles.approvalNoticeTitle}>Este evento exige aprovação</Text>
                        </View>
                        <Text style={styles.approvalNoticeText}>
                            O pagamento acontece agora. Após a confirmação, sua vaga fica reservada enquanto o anfitrião analisa sua inscrição.
                        </Text>
                        <View style={styles.approvalSteps}>
                            {[
                                'Faça o pagamento',
                                'Vaga reservada · aguarde a aprovação',
                                'Após a aprovação, receba seu ingresso',
                            ].map((step, index) => (
                                <View key={step} style={styles.approvalStepRow}>
                                    <View style={styles.approvalStepNumber}>
                                        <Text style={styles.approvalStepNumberText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.approvalStep}>{step}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.approvalRefundText}>
                            Se o anfitrião recusar, o valor pago será devolvido integralmente pelo meio de pagamento.
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={styles.protectionCard}
                    onPress={() => router.push('/legal/protection' as any)}
                    accessibilityRole="link"
                    accessibilityLabel="Conhecer a Proteção Wellcome"
                >
                    <View style={styles.protectionHeader}>
                        <Ionicons name="shield-checkmark" size={22} color={Palette.green} />
                        <Text style={styles.protectionTitle}>Pague pelo Wellcome</Text>
                        <Ionicons name="chevron-forward" size={19} color={Palette.green} />
                    </View>
                    <Text style={styles.protectionText}>
                        Pagamento registrado, suporte a reembolsos e saldo do anfitrião retido até 24 horas após o evento.
                    </Text>
                    <Text style={styles.protectionWarning}>Pagamentos feitos por fora não têm a cobertura da plataforma.</Text>
                </TouchableOpacity>

                <View style={styles.segmentedControl} accessibilityRole="tablist">
                    <TouchableOpacity
                        style={[styles.segment, method === 'pix' && styles.activeSegment]}
                        onPress={() => setMethod('pix')}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: method === 'pix' }}
                    >
                        <Ionicons name="qr-code-outline" size={20} color={method === 'pix' ? Palette.ink : Palette.inkSoft} />
                        <Text style={[styles.segmentText, method === 'pix' && styles.activeSegmentText]}>Pix</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segment, method === 'card' && styles.activeSegment]}
                        onPress={() => setMethod('card')}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: method === 'card' }}
                    >
                        <Ionicons name="card-outline" size={20} color={method === 'card' ? Palette.ink : Palette.inkSoft} />
                        <Text style={[styles.segmentText, method === 'card' && styles.activeSegmentText]}>Cartão</Text>
                    </TouchableOpacity>
                </View>

                {method === 'pix' ? (
                    <View style={styles.methodContent}>
                        {pix ? (
                            <>
                                {pix.environment === 'sandbox' && (
                                    <View style={styles.sandboxBanner}>
                                        <Ionicons name="flask-outline" size={19} color={Palette.orangeDeep} />
                                        <Text style={styles.sandboxText}>Teste: confirme esta cobrança no painel Sandbox do Asaas.</Text>
                                    </View>
                                )}
                                {pix.awaitingSettlement ? (
                                    <View style={styles.reviewBlock}>
                                        <View style={[styles.statusIcon, { backgroundColor: Palette.orangeSoft }]}>
                                            <Ionicons name="time-outline" size={34} color={Palette.orangeDeep} />
                                        </View>
                                        <Text style={styles.reviewTitle}>Pagamento em análise</Text>
                                        <Text style={styles.reviewText}>
                                            O Asaas confirmou o Pix, mas a liquidação ainda está em análise. Depois da liquidação, a participação também dependerá da aprovação do anfitrião quando exigida.
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <View style={styles.qrArea}>
                                            <QRCode value={pix.pixCopyPaste} size={214} quietZone={8} />
                                        </View>
                                        <Text style={styles.expirationLabel}>Expira em {formatRemaining()}</Text>
                                        <TouchableOpacity style={styles.primaryButton} onPress={copyPix} accessibilityRole="button">
                                            <Ionicons name="copy-outline" size={20} color="#FFFFFF" />
                                            <Text style={styles.primaryButtonText}>Copiar código Pix</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => void checkPaymentStatus(true)}
                                    disabled={checking}
                                    accessibilityRole="button"
                                    accessibilityLabel="Verificar pagamento"
                                    accessibilityState={{ disabled: checking }}
                                >
                                    {checking ? <ActivityIndicator color={Palette.orange} /> : (
                                        <>
                                            <Ionicons name="refresh" size={20} color={Palette.ink} />
                                            <Text style={styles.secondaryButtonText}>Verificar pagamento</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : wallet?.pixReady ? (
                            <>
                                <View style={styles.methodIntro}>
                                    <View style={[styles.methodIcon, { backgroundColor: Palette.greenSoft }]}>
                                        <Ionicons name="flash-outline" size={22} color={Palette.green} />
                                    </View>
                                    <View style={styles.flexText}>
                                        <Text style={styles.methodTitle}>Pagamento instantâneo</Text>
                                        <Text style={styles.methodSubtitle}>O QR Code aparecerá aqui, sem sair do Wellcome.</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={[styles.primaryButton, processing && styles.disabledButton]}
                                    onPress={generatePix}
                                    disabled={processing}
                                    accessibilityRole="button"
                                    accessibilityLabel="Gerar Pix"
                                    accessibilityState={{ disabled: processing }}
                                >
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
                                            accessibilityRole="radio"
                                            accessibilityState={{ checked: selected }}
                                        >
                                            <View style={styles.cardIcon}>
                                                <Ionicons name="card" size={22} color={Palette.blue} />
                                            </View>
                                            <View style={styles.flexText}>
                                                <Text style={styles.cardTitle}>{displayCardBrand(card.brand)} final {card.lastFour}</Text>
                                                <Text style={styles.cardSubtitle}>Validade {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}</Text>
                                            </View>
                                            <Ionicons
                                                name={selected ? 'radio-button-on' : 'radio-button-off'}
                                                size={22}
                                                color={selected ? Palette.orange : Palette.subtle}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}

                                <TouchableOpacity style={styles.addCardButton} onPress={openAddCard} accessibilityRole="button">
                                    <Ionicons name="add-circle-outline" size={21} color={Palette.orangeDeep} />
                                    <Text style={styles.addCardText}>Adicionar cartão</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.primaryButton, processing && styles.disabledButton]}
                                    onPress={payWithCard}
                                    disabled={processing}
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled: processing }}
                                >
                                    {processing ? <ActivityIndicator color="#FFFFFF" /> : (
                                        <>
                                            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                                            <Text style={styles.primaryButtonText}>Pagar R$ {formattedAmount}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                <View style={styles.securityRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={Palette.muted} />
                    <Text style={styles.securityText}>Dados protegidos e processados pelo Asaas.</Text>
                </View>
            </ScrollView>
        </PaymentShell>
    );
}

function PaymentShell({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
    return (
        <View style={styles.screen}>
            <BrandStackHeader eyebrow="EVENTO" title="Pagamento" backIcon="close" actions={actions} />
            <BrandSheet>{children}</BrandSheet>
        </View>
    );
}

type StatusStateProps = {
    icon: string;
    color: string;
    background: string;
    title: string;
    body: string;
    onBack: () => void;
    children?: React.ReactNode;
};

function StatusState({ icon, color, background, title, body, onBack, children }: StatusStateProps) {
    return (
        <View style={styles.centered}>
            <View style={[styles.statusIcon, { backgroundColor: background }]}>
                <Ionicons name={icon} size={36} color={color} />
            </View>
            <Text style={styles.successTitle}>{title}</Text>
            <Text style={styles.successSubtitle}>{body}</Text>
            {children}
            <TouchableOpacity style={styles.primaryButton} onPress={onBack} accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Voltar ao evento</Text>
            </TouchableOpacity>
        </View>
    );
}

function MissingProfile({ onPress, card }: { onPress: () => void; card: boolean }) {
    return (
        <View style={styles.missingBlock}>
            <View style={[styles.statusIcon, { backgroundColor: Palette.orangeSoft }]}>
                <Ionicons name="person-circle-outline" size={34} color={Palette.orangeDeep} />
            </View>
            <Text style={styles.missingTitle}>Complete seus dados de cobrança</Text>
            <Text style={styles.missingText}>
                {card
                    ? 'Cadastre CPF e endereço uma vez para usar cartões com mais rapidez.'
                    : 'Precisamos do seu CPF e contato para identificar a cobrança.'}
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={onPress} accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Completar dados</Text>
            </TouchableOpacity>
        </View>
    );
}

const cardBase = {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.lineSoft,
    borderRadius: 22,
    padding: 14,
} as const;

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.paper },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl, gap: Spacing.md },
    content: { padding: Spacing.xl },
    amountBlock: { ...cardBase, alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.lg },
    amountLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2, color: Palette.muted, marginBottom: 6 },
    amountValue: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, color: Palette.ink },
    approvalNotice: {
        backgroundColor: Palette.orangeSoft, borderRadius: 22, padding: Spacing.lg, marginBottom: Spacing.lg,
    },
    approvalNoticeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    approvalNoticeTitle: { flex: 1, color: Palette.orangeDarker, fontSize: 15, fontWeight: '800' },
    approvalNoticeText: { color: Palette.inkSoft, fontSize: 14, lineHeight: 21 },
    approvalSteps: { gap: Spacing.sm, marginTop: Spacing.md },
    approvalStepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    approvalStepNumber: {
        width: 22, height: 22, borderRadius: 11, backgroundColor: Palette.surface,
        alignItems: 'center', justifyContent: 'center',
    },
    approvalStepNumberText: { fontSize: 12, fontWeight: '800', color: Palette.orangeDeep },
    approvalStep: { flex: 1, color: Palette.ink, fontSize: 13, fontWeight: '700' },
    approvalRefundText: { color: Palette.inkSoft, fontSize: 12, lineHeight: 18, marginTop: Spacing.md },
    protectionCard: {
        backgroundColor: Palette.greenSoft, borderRadius: 22, padding: Spacing.lg, marginBottom: Spacing.xl, minHeight: 44,
    },
    protectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    protectionTitle: { flex: 1, color: Palette.green, fontSize: 15, fontWeight: '800' },
    protectionText: { color: Palette.inkSoft, fontSize: 13, lineHeight: 19, marginTop: Spacing.sm },
    protectionWarning: { color: Palette.orangeDeep, fontSize: 12, lineHeight: 18, fontWeight: '700', marginTop: 6 },
    segmentedControl: {
        flexDirection: 'row', gap: 4, padding: 4, backgroundColor: Palette.track, borderRadius: BorderRadius.full,
    },
    segment: {
        flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    activeSegment: {
        backgroundColor: Palette.surface,
        shadowColor: Elevation.card.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    segmentText: { fontSize: 14, fontWeight: '700', color: Palette.inkSoft },
    activeSegmentText: { color: Palette.ink, fontWeight: '800' },
    methodContent: { marginTop: Spacing.xl },
    methodIntro: { ...cardBase, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    methodIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    methodTitle: { fontSize: 16, fontWeight: '800', color: Palette.ink },
    methodSubtitle: { fontSize: 14, lineHeight: 20, color: Palette.inkSoft, marginTop: 3 },
    flexText: { flex: 1 },
    primaryButton: {
        minHeight: 52, borderRadius: BorderRadius.full, backgroundColor: Palette.orange, flexDirection: 'row',
        alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.xxl,
        marginTop: Spacing.xl, alignSelf: 'stretch',
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    secondaryButton: {
        minHeight: 48, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Palette.line,
        backgroundColor: Palette.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginTop: Spacing.md,
    },
    secondaryButtonText: { color: Palette.ink, fontSize: 15, fontWeight: '800' },
    disabledButton: { opacity: 0.6 },
    sandboxBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Palette.orangeSoft,
        borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg,
    },
    sandboxText: { flex: 1, color: Palette.orangeDarker, fontSize: 13, lineHeight: 18 },
    qrArea: { ...cardBase, alignItems: 'center', alignSelf: 'center', padding: Spacing.lg },
    expirationLabel: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: Palette.inkSoft, marginTop: Spacing.md },
    reviewBlock: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.md },
    reviewTitle: { marginTop: Spacing.md, fontSize: 18, fontWeight: '800', color: Palette.ink },
    reviewText: { marginTop: 6, maxWidth: 330, textAlign: 'center', fontSize: 14, lineHeight: 21, color: Palette.inkSoft },
    cardRow: {
        ...cardBase, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 10,
    },
    selectedCardRow: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
    cardIcon: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: Palette.blueSoft, alignItems: 'center', justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    cardSubtitle: { fontSize: 13, color: Palette.inkSoft, marginTop: 3 },
    addCardButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    addCardText: { color: Palette.orangeDeep, fontSize: 15, fontWeight: '800' },
    missingBlock: { ...cardBase, alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
    missingTitle: { marginTop: Spacing.md, fontSize: 18, fontWeight: '800', color: Palette.ink, textAlign: 'center' },
    missingText: { marginTop: 6, fontSize: 14, color: Palette.inkSoft, textAlign: 'center', lineHeight: 21, maxWidth: 320 },
    securityRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: Spacing.xxl },
    securityText: { flexShrink: 1, fontSize: 12, color: Palette.muted, textAlign: 'center' },
    mutedText: { fontSize: 15, color: Palette.inkSoft },
    statusIcon: {
        width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: Palette.ink, textAlign: 'center' },
    successSubtitle: { fontSize: 15, lineHeight: 22, color: Palette.inkSoft, textAlign: 'center', maxWidth: 340 },
    refundNotice: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Palette.orangeSoft,
        borderRadius: BorderRadius.lg, padding: Spacing.md, maxWidth: 340,
    },
    refundNoticeText: { flex: 1, color: Palette.orangeDarker, fontSize: 13, lineHeight: 18 },
});
