import { userService } from '@/services/api/UserService';
import { walletService } from '@/services/api/WalletService';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';
import { resetToLogin } from '@/shared/lib/navigation';

const PIX_KEY_TYPE_LABELS: Record<string, string> = {
    CPF: 'CPF',
    EMAIL: 'E-mail',
    PHONE: 'Telefone',
    EVP: 'Chave Aleatória',
};

export default function WalletScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [pendingBalance, setPendingBalance] = useState(0);
    const [pixKey, setPixKey] = useState<string | null>(null);
    const [pixKeyType, setPixKeyType] = useState<string | null>(null);
    const [minimumWithdrawalAmount, setMinimumWithdrawalAmount] = useState(50);

    const loadData = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { resetToLogin(); return; }
            setUserId(session.user.id);
            const [profile, withdrawalConfig] = await Promise.all([
                userService.getProfile(session.user.id),
                walletService.getWithdrawalConfig(),
            ]);
            setBalance(Number(profile.walletBalance ?? 0));
            setPendingBalance(Number(profile.pendingWalletBalance ?? 0));
            setPixKey(profile.pixKey ?? null);
            setPixKeyType(profile.pixKeyType ?? null);
            setMinimumWithdrawalAmount(Number(withdrawalConfig.minimumWithdrawalAmount || 50));
        } catch (e) {
            console.error('Error loading wallet:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(false);
    };

    async function handleRequestWithdrawal() {
        if (!userId) return;

        if (!pixKey) {
            Alert.alert(
                'Chave PIX não cadastrada',
                'Você precisa cadastrar uma chave PIX antes de solicitar um saque.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Cadastrar Agora', onPress: () => router.push('/profile/pix-key') },
                ]
            );
            return;
        }

        if (balance < minimumWithdrawalAmount) {
            Alert.alert(
                'Saldo abaixo do saque mínimo',
                `O saque mínimo é de R$ ${minimumWithdrawalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Seu saldo continua disponível e pode ser acumulado.`
            );
            return;
        }

        Alert.alert(
            'Confirmar Saque',
            `Deseja solicitar o saque de todo o saldo disponível?\n\nValor: R$ ${balance.toFixed(2)}\nChave PIX: ${pixKey}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        setRequesting(true);
                        try {
                            await walletService.requestWithdrawal(balance);
                            Alert.alert(
                                '✅ Solicitação enviada!',
                                'Seu saque foi solicitado com sucesso. A equipe Wellcome irá processar em até 2 dias úteis.',
                                [{ text: 'OK', onPress: () => loadData() }]
                            );
                        } catch (e: any) {
                            Alert.alert('Erro', friendlyErrorMessage(e, 'Não foi possível solicitar o saque.'));
                        } finally {
                            setRequesting(false);
                        }
                    }
                }
            ]
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <BrandStackHeader eyebrow="FINANCEIRO" title="Minha Carteira" />
                <BrandSheet>
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                </BrandSheet>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BrandStackHeader eyebrow="FINANCEIRO" title="Minha Carteira" />

            <BrandSheet>
                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.orange} colors={[Palette.orange]} />}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Balance Card */}
                    <View style={styles.balanceCard}>
                        <View style={styles.balanceIconContainer}>
                            <Ionicons name="wallet-outline" size={30} color={Palette.orangeDeep} />
                        </View>
                        <Text style={styles.balanceLabel}>SALDO DISPONÍVEL</Text>
                        <Text style={styles.balanceValue}>
                            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text style={styles.balanceSubtitle}>Atualizado agora há pouco</Text>
                    </View>

                    <View style={styles.pendingBalanceCard}>
                        <View style={styles.pendingBalanceHeader}>
                            <Ionicons name="time-outline" size={22} color={Palette.orangeDarker} />
                            <Text style={styles.pendingBalanceTitle}>Saldo retido</Text>
                        </View>
                        <Text style={styles.pendingBalanceValue}>
                            R$ {pendingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        <Text style={styles.pendingBalanceHelp}>
                            Pagamentos aprovados ficam protegidos e são liberados 24 horas após o fim do evento.
                        </Text>
                    </View>

                    {/* PIX Key Card */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="key-outline" size={20} color={Palette.orangeDeep} />
                            <Text style={styles.sectionTitle}>Chave PIX de Recebimento</Text>
                        </View>
                        {pixKey ? (
                            <View style={styles.pixKeyRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.pixKeyTypeLabel}>
                                        {PIX_KEY_TYPE_LABELS[pixKeyType ?? ''] ?? pixKeyType}
                                    </Text>
                                    <Text style={styles.pixKeyValue}>{pixKey}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.editKeyButton}
                                    onPress={() => router.push('/profile/pix-key')}
                                    accessibilityRole="button"
                                    accessibilityLabel="Editar chave PIX"
                                >
                                    <Ionicons name="pencil-outline" size={16} color={Palette.ink} />
                                    <Text style={styles.editKeyButtonText}>Editar</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.addKeyButton}
                                onPress={() => router.push('/profile/pix-key')}
                                accessibilityRole="button"
                            >
                                <Ionicons name="add-circle-outline" size={20} color={Palette.orangeDeep} />
                                <Text style={styles.addKeyButtonText}>Cadastrar Chave PIX</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* How It Works */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="information-circle-outline" size={20} color={Palette.blue} />
                            <Text style={styles.sectionTitle}>Como funciona?</Text>
                        </View>
                        {[
                            { icon: 'checkmark-circle-outline', text: 'Quando o pagamento é confirmado e você aprova o participante, o valor líquido aparece como saldo retido.' },
                            { icon: 'time-outline', text: 'O saldo fica retido até 24 horas após o fim do evento para cobrir cancelamentos e reembolsos.' },
                            { icon: 'cash-outline', text: `Depois da liberação, valores a partir de R$ ${minimumWithdrawalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} podem ser sacados.` },
                        ].map((item, i) => (
                            <View key={i} style={styles.howItWorksItem}>
                                <Ionicons name={item.icon as any} size={18} color={Palette.blue} style={{ marginTop: 1 }} />
                                <Text style={styles.howItWorksText}>{item.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Withdraw Button */}
                    <TouchableOpacity
                        style={[styles.withdrawButton, (balance < minimumWithdrawalAmount || requesting) && styles.withdrawButtonDisabled]}
                        onPress={handleRequestWithdrawal}
                        disabled={requesting || balance < minimumWithdrawalAmount}
                        accessibilityRole="button"
                        accessibilityLabel="Solicitar Saque"
                        accessibilityState={{ disabled: requesting || balance < minimumWithdrawalAmount, busy: requesting }}
                    >
                        {requesting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons name="arrow-down-circle-outline" size={22} color="#FFFFFF" />
                                <Text style={styles.withdrawButtonText}>Solicitar Saque</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {!pixKey && (
                        <Text style={styles.noKeyWarning}>
                            ⚠️ Cadastre uma chave PIX para poder solicitar saques.
                        </Text>
                    )}

                    {pixKey && balance < minimumWithdrawalAmount && (
                        <Text style={styles.noKeyWarning}>
                            Acumule pelo menos R$ {minimumWithdrawalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para solicitar um saque.
                        </Text>
                    )}

                    <View style={{ height: Spacing.xxxl }} />
                </ScrollView>
            </BrandSheet>
        </View>
    );
}

const card = {
    backgroundColor: Palette.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.lineSoft,
    padding: 14,
} as const;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.paper },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: Spacing.xl, gap: Spacing.md },

    // Balance Card
    balanceCard: {
        ...card,
        paddingVertical: Spacing.xxl,
        alignItems: 'center',
    },
    balanceIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Palette.orangeSoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    balanceLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: Palette.muted,
        letterSpacing: 1.6,
        marginBottom: Spacing.sm,
    },
    balanceValue: {
        fontSize: 38,
        fontWeight: '800',
        letterSpacing: -0.5,
        color: Palette.ink,
        marginBottom: Spacing.xs,
    },
    balanceSubtitle: { fontSize: 12, color: Palette.muted },
    pendingBalanceCard: {
        ...card,
        backgroundColor: Palette.orangeSoft,
        borderColor: Palette.line,
    },
    pendingBalanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    pendingBalanceTitle: { fontSize: 15, fontWeight: '800', color: Palette.orangeDarker },
    pendingBalanceValue: { fontSize: 28, fontWeight: '800', color: Palette.ink, marginBottom: 6 },
    pendingBalanceHelp: { fontSize: 13, lineHeight: 19, color: Palette.inkSoft },

    // Section Cards
    sectionCard: card,
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: Palette.ink },

    // PIX Key
    pixKeyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.paper,
        borderRadius: BorderRadius.lg,
        padding: 14,
    },
    pixKeyTypeLabel: { fontSize: 11, color: Palette.muted, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 2 },
    pixKeyValue: { fontSize: 15, color: Palette.ink, fontWeight: '700' },
    editKeyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minHeight: 44,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    editKeyButtonText: { fontSize: 14, color: Palette.ink, fontWeight: '800' },
    addKeyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        borderWidth: 1.5,
        borderColor: Palette.orange,
        borderStyle: 'dashed',
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orangeSoft,
    },
    addKeyButtonText: { fontSize: 15, color: Palette.orangeDeep, fontWeight: '800' },

    // How It Works
    howItWorksItem: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: Spacing.md,
        alignItems: 'flex-start',
    },
    howItWorksText: { flex: 1, fontSize: 14, color: Palette.inkSoft, lineHeight: 21 },

    // Withdraw Button
    withdrawButton: {
        backgroundColor: Palette.orange,
        borderRadius: BorderRadius.full,
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: Spacing.xs,
        ...Elevation.floating,
    },
    withdrawButtonDisabled: { backgroundColor: Palette.subtle, shadowOpacity: 0, elevation: 0 },
    withdrawButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    noKeyWarning: {
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 19,
        color: Palette.orangeDeep,
        paddingHorizontal: 10,
    },
});
