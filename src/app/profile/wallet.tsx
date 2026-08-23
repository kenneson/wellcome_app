import { userService } from '@/services/api/UserService';
import { walletService } from '@/services/api/WalletService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
            if (!session) { router.replace('/auth/login'); return; }
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

    useEffect(() => { loadData(); }, []);

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
                            Alert.alert('Erro', e.message || 'Não foi possível solicitar o saque.');
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
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Minha Carteira</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C42" />}
            >
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceIconContainer}>
                        <Ionicons name="wallet-outline" size={32} color="#fff" />
                    </View>
                    <Text style={styles.balanceLabel}>SALDO DISPONÍVEL</Text>
                    <Text style={styles.balanceValue}>
                        R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.balanceSubtitle}>Atualizado agora há pouco</Text>
                </View>

                <View style={styles.pendingBalanceCard}>
                    <View style={styles.pendingBalanceHeader}>
                        <Ionicons name="time-outline" size={22} color="#B45309" />
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
                        <Ionicons name="key-outline" size={20} color="#FF8C42" />
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
                            >
                                <Ionicons name="pencil-outline" size={16} color="#FF8C42" />
                                <Text style={styles.editKeyButtonText}>Editar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={styles.addKeyButton}
                            onPress={() => router.push('/profile/pix-key')}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#FF8C42" />
                            <Text style={styles.addKeyButtonText}>Cadastrar Chave PIX</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* How It Works */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
                        <Text style={[styles.sectionTitle, { color: '#1565C0' }]}>Como funciona?</Text>
                    </View>
                    {[
                        { icon: 'checkmark-circle-outline', text: 'Quando um convidado aprovado paga o ingresso, o valor líquido aparece como saldo retido.' },
                        { icon: 'time-outline', text: 'O saldo fica retido até 24 horas após o fim do evento para cobrir cancelamentos e reembolsos.' },
                        { icon: 'cash-outline', text: `Depois da liberação, valores a partir de R$ ${minimumWithdrawalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} podem ser sacados.` },
                    ].map((item, i) => (
                        <View key={i} style={styles.howItWorksItem}>
                            <Ionicons name={item.icon as any} size={18} color="#2196F3" style={{ marginTop: 1 }} />
                            <Text style={styles.howItWorksText}>{item.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Withdraw Button */}
                <TouchableOpacity
                    style={[styles.withdrawButton, (balance < minimumWithdrawalAmount || requesting) && styles.withdrawButtonDisabled]}
                    onPress={handleRequestWithdrawal}
                    disabled={requesting || balance < minimumWithdrawalAmount}
                >
                    {requesting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="arrow-down-circle-outline" size={22} color="#fff" />
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

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 20, gap: 16 },

    // Balance Card
    balanceCard: {
        backgroundColor: '#FF8C42',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    balanceIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    balanceLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    balanceValue: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    balanceSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    pendingBalanceCard: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
    },
    pendingBalanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    pendingBalanceTitle: { fontSize: 15, fontWeight: '700', color: '#92400E' },
    pendingBalanceValue: { fontSize: 28, fontWeight: '800', color: '#78350F', marginBottom: 6 },
    pendingBalanceHelp: { fontSize: 13, lineHeight: 19, color: '#92400E' },

    // Section Cards
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333' },

    // PIX Key
    pixKeyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8F3',
        borderRadius: 10,
        padding: 14,
    },
    pixKeyTypeLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2 },
    pixKeyValue: { fontSize: 15, color: '#333', fontWeight: '600' },
    editKeyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF8C42',
    },
    editKeyButtonText: { fontSize: 13, color: '#FF8C42', fontWeight: '600' },
    addKeyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#FF8C42',
        borderStyle: 'dashed',
        borderRadius: 10,
    },
    addKeyButtonText: { fontSize: 15, color: '#FF8C42', fontWeight: '600' },

    // How It Works
    howItWorksItem: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    howItWorksText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },

    // Withdraw Button
    withdrawButton: {
        backgroundColor: '#2E7D32',
        borderRadius: 14,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginTop: 4,
    },
    withdrawButtonDisabled: { backgroundColor: '#aaa', shadowColor: '#aaa' },
    withdrawButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    noKeyWarning: {
        textAlign: 'center',
        fontSize: 13,
        color: '#E65100',
        marginTop: -4,
        paddingHorizontal: 10,
    },
});
