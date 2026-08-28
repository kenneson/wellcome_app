import { userService } from '@/services/api/UserService';
import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingsRowProps {
    icon: IconName;
    iconColor: string;
    iconBackground: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    danger?: boolean;
    loading?: boolean;
}

export default function SettingsScreen() {
    const router = useRouter();
    const [signingOut, setSigningOut] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);

    const handleSignOut = () => {
        Alert.alert('Sair da conta', 'Deseja encerrar sua sessão neste aparelho?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair',
                style: 'destructive',
                onPress: async () => {
                    setSigningOut(true);
                    try {
                        const { error } = await supabase.auth.signOut();
                        if (error) throw error;
                        router.replace('/auth/login');
                    } catch (error: any) {
                        Alert.alert('Erro ao sair', error?.message || 'Tente novamente.');
                    } finally {
                        setSigningOut(false);
                    }
                },
            },
        ]);
    };

    const handleTestNotification = async () => {
        if (testingNotification) return;
        setTestingNotification(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada.');

            const profile = await userService.getProfile(session.user.id);
            if (!profile.expoPushToken) {
                throw new Error('Token de notificação não encontrado. Verifique as permissões.');
            }

            const response = await fetch(`${API_URL}/notifications/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    token: profile.expoPushToken,
                    title: 'Olá!',
                    body: 'Esta é uma notificação de teste do Wellcome.',
                    data: { test: true },
                }),
            });
            if (!response.ok) throw new Error('Falha ao enviar notificação.');
            Alert.alert('Notificação enviada', 'Verifique seu dispositivo.');
        } catch (error: any) {
            Alert.alert('Não foi possível testar', error?.message || 'Erro de conexão.');
        } finally {
            setTestingNotification(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar"
                >
                    <Ionicons name="chevron-back" size={26} color="#202124" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Configurações</Text>
                <View style={styles.headerButton} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <SettingsSection title="PERFIL">
                    <SettingsRow
                        icon="person-outline"
                        iconColor="#C45D22"
                        iconBackground="#FFF1E8"
                        title="Editar perfil"
                        subtitle="Foto, bio e informações pessoais"
                        onPress={() => router.push('/profile/edit')}
                    />
                </SettingsSection>

                <SettingsSection title="FINANCEIRO">
                    <SettingsRow
                        icon="card-outline"
                        iconColor="#315E9E"
                        iconBackground="#EDF3FB"
                        title="Meus pagamentos"
                        subtitle="Dados de cobrança e cartões salvos"
                        onPress={() => router.push('/profile/payments' as any)}
                    />
                    <SettingsRow
                        icon="wallet-outline"
                        iconColor="#187A67"
                        iconBackground="#EAF7F3"
                        title="Carteira e saques"
                        subtitle="Saldo recebido pelos seus eventos"
                        onPress={() => router.push('/profile/wallet')}
                    />
                    <SettingsRow
                        icon="flash-outline"
                        iconColor="#8B6300"
                        iconBackground="#FFF6D9"
                        title="Chave Pix"
                        subtitle="Conta de destino para seus saques"
                        onPress={() => router.push('/profile/pix-key')}
                    />
                </SettingsSection>

                <SettingsSection title="APLICATIVO">
                    <SettingsRow
                        icon="notifications-outline"
                        iconColor="#2374AB"
                        iconBackground="#EAF4FB"
                        title="Notificações"
                        subtitle="Veja avisos e atualizações do Wellcome"
                        onPress={() => router.push('/notifications')}
                    />
                    {__DEV__ && (
                        <SettingsRow
                            icon="paper-plane-outline"
                            iconColor="#5D646A"
                            iconBackground="#F0F2F4"
                            title="Testar notificação push"
                            subtitle="Disponível somente em desenvolvimento"
                            onPress={() => void handleTestNotification()}
                            loading={testingNotification}
                        />
                    )}
                </SettingsSection>

                <SettingsSection title="LEGAL E SEGURANÇA">
                    <SettingsRow
                        icon="document-text-outline"
                        iconColor="#315E9E"
                        iconBackground="#EDF3FB"
                        title="Termos de Uso"
                        subtitle="Regras para participantes e anfitriões"
                        onPress={() => router.push('/legal/terms' as any)}
                    />
                    <SettingsRow
                        icon="lock-closed-outline"
                        iconColor="#187A67"
                        iconBackground="#EAF7F3"
                        title="Política de Privacidade"
                        subtitle="Como seus dados são tratados"
                        onPress={() => router.push('/legal/privacy' as any)}
                    />
                    <SettingsRow
                        icon="shield-checkmark-outline"
                        iconColor="#C45D22"
                        iconBackground="#FFF1E8"
                        title="Proteção Wellcome"
                        subtitle="Benefícios de pagar dentro da plataforma"
                        onPress={() => router.push('/legal/protection' as any)}
                    />
                </SettingsSection>

                <SettingsSection title="CONTA">
                    <SettingsRow
                        icon="log-out-outline"
                        iconColor="#B33A34"
                        iconBackground="#FFF0EF"
                        title="Sair da conta"
                        subtitle="Encerrar a sessão neste aparelho"
                        onPress={handleSignOut}
                        danger
                        loading={signingOut}
                    />
                    <SettingsRow
                        icon="trash-outline"
                        iconColor="#B33A34"
                        iconBackground="#FFF0EF"
                        title="Excluir conta"
                        subtitle="Remover permanentemente sua conta"
                        onPress={() => router.push('/profile/delete-account')}
                        danger
                    />
                </SettingsSection>
            </ScrollView>
        </SafeAreaView>
    );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.rows}>{children}</View>
        </View>
    );
}

function SettingsRow({
    icon,
    iconColor,
    iconBackground,
    title,
    subtitle,
    onPress,
    danger,
    loading,
}: SettingsRowProps) {
    return (
        <TouchableOpacity
            style={styles.row}
            onPress={onPress}
            disabled={loading}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityHint={subtitle}
        >
            <View style={[styles.iconBox, { backgroundColor: iconBackground }]}>
                <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <View style={styles.rowText}>
                <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="small" color={iconColor} />
            ) : (
                <Ionicons name="chevron-forward" size={20} color="#A4A8AD" />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E2E4E7',
    },
    headerButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#202124' },
    content: { paddingBottom: 40 },
    section: { marginTop: 24 },
    sectionTitle: {
        paddingHorizontal: 20,
        marginBottom: 8,
        fontSize: 12,
        fontWeight: '800',
        color: '#73787E',
        letterSpacing: 0,
    },
    rows: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#E5E7E9',
    },
    row: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E7E9EB',
    },
    iconBox: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 16, fontWeight: '700', color: '#202124' },
    rowSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, color: '#73787E' },
    dangerText: { color: '#B33A34' },
});
