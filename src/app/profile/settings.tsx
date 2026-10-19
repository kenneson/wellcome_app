import { userService } from '@/services/api/UserService';
import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
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
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

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
                        Alert.alert('Erro ao sair', friendlyErrorMessage(error, 'Tente novamente.'));
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
            Alert.alert('Não foi possível testar', friendlyErrorMessage(error, 'Erro de conexão.'));
        } finally {
            setTestingNotification(false);
        }
    };

    return (
        <View style={styles.screen}>
            <BrandStackHeader eyebrow="CONTA" title="Configurações" />

            <BrandSheet>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <SettingsSection title="PERFIL">
                        <SettingsRow
                            icon="person-outline"
                            iconColor={Palette.orangeDeep}
                            iconBackground={Palette.orangeSoft}
                            title="Editar perfil"
                            subtitle="Foto, bio e informações pessoais"
                            onPress={() => router.push('/profile/edit')}
                        />
                    </SettingsSection>

                    <SettingsSection title="FINANCEIRO">
                        <SettingsRow
                            icon="card-outline"
                            iconColor={Palette.blue}
                            iconBackground={Palette.blueSoft}
                            title="Meus pagamentos"
                            subtitle="Dados de cobrança e cartões salvos"
                            onPress={() => router.push('/profile/payments' as any)}
                        />
                        <SettingsRow
                            icon="wallet-outline"
                            iconColor={Palette.green}
                            iconBackground={Palette.greenSoft}
                            title="Carteira e saques"
                            subtitle="Saldo recebido pelos seus eventos"
                            onPress={() => router.push('/profile/wallet')}
                        />
                        <SettingsRow
                            icon="flash-outline"
                            iconColor={Palette.orangeDarker}
                            iconBackground={Palette.track}
                            title="Chave Pix"
                            subtitle="Conta de destino para seus saques"
                            onPress={() => router.push('/profile/pix-key')}
                        />
                    </SettingsSection>

                    <SettingsSection title="APLICATIVO">
                        <SettingsRow
                            icon="notifications-outline"
                            iconColor={Palette.blue}
                            iconBackground={Palette.blueSoft}
                            title="Notificações"
                            subtitle="Veja avisos e atualizações do Wellcome"
                            onPress={() => router.push('/notifications')}
                        />
                        {__DEV__ && (
                            <SettingsRow
                                icon="paper-plane-outline"
                                iconColor={Palette.inkSoft}
                                iconBackground={Palette.track}
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
                            iconColor={Palette.blue}
                            iconBackground={Palette.blueSoft}
                            title="Termos de Uso"
                            subtitle="Regras para participantes e anfitriões"
                            onPress={() => router.push('/legal/terms' as any)}
                        />
                        <SettingsRow
                            icon="lock-closed-outline"
                            iconColor={Palette.green}
                            iconBackground={Palette.greenSoft}
                            title="Política de Privacidade"
                            subtitle="Como seus dados são tratados"
                            onPress={() => router.push('/legal/privacy' as any)}
                        />
                        <SettingsRow
                            icon="shield-checkmark-outline"
                            iconColor={Palette.orangeDeep}
                            iconBackground={Palette.orangeSoft}
                            title="Proteção Wellcome"
                            subtitle="Benefícios de pagar dentro da plataforma"
                            onPress={() => router.push('/legal/protection' as any)}
                        />
                    </SettingsSection>

                    <SettingsSection title="CONTA">
                        <SettingsRow
                            icon="log-out-outline"
                            iconColor={Palette.danger}
                            iconBackground={Palette.dangerLine}
                            title="Sair da conta"
                            subtitle="Encerrar a sessão neste aparelho"
                            onPress={handleSignOut}
                            danger
                            loading={signingOut}
                        />
                        <SettingsRow
                            icon="trash-outline"
                            iconColor={Palette.danger}
                            iconBackground={Palette.dangerLine}
                            title="Excluir conta"
                            subtitle="Remover permanentemente sua conta"
                            onPress={() => router.push('/profile/delete-account')}
                            danger
                        />
                    </SettingsSection>
                </ScrollView>
            </BrandSheet>
        </View>
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
                <Ionicons name="chevron-forward" size={20} color={Palette.subtle} />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.paper },
    content: { padding: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xxxl * 2 },
    section: { marginTop: Spacing.xl },
    sectionTitle: {
        paddingHorizontal: Spacing.xs,
        marginBottom: Spacing.sm,
        fontSize: 11,
        fontWeight: '800',
        color: Palette.muted,
        letterSpacing: 1.2,
    },
    rows: {
        overflow: 'hidden',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    row: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Palette.lineSoft,
    },
    iconBox: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    rowSubtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, color: Palette.inkSoft },
    dangerText: { color: Palette.danger },
});
