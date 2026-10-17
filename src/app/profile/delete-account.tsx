import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const CONFIRMATION_TEXT = 'EXCLUIR';

export default function DeleteAccountScreen() {
    const router = useRouter();
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const canDelete = confirmationText.trim().toUpperCase() === CONFIRMATION_TEXT;

    async function handleDeleteAccount() {
        if (!canDelete || isDeleting) {
            return;
        }

        Alert.alert(
            'Excluir conta',
            'Essa ação é permanente. Seu acesso será removido e os dados pessoais do perfil serão anonimizados.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir agora',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await userService.deleteAccount();
                            await supabase.auth.signOut();

                            Alert.alert('Conta excluída', 'Sua conta foi removida com sucesso.', [
                                {
                                    text: 'OK',
                                    onPress: () => router.replace('/auth/login'),
                                }
                            ]);
                        } catch (error: any) {
                            Alert.alert('Não foi possível excluir', error?.message || 'Tente novamente em alguns minutos.');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ],
        );
    }

    return (
        <View style={styles.container}>
            <BrandStackHeader eyebrow="CONTA" title="Excluir conta" />

            <BrandSheet>
                <KeyboardAwareScrollView contentContainerStyle={styles.content}>
                    <View style={styles.hero}>
                        <View style={styles.iconBadge}>
                            <Ionicons name="trash-outline" size={28} color={Palette.danger} />
                        </View>
                        <Text style={styles.title}>Excluir conta</Text>
                        <Text style={styles.subtitle}>
                            Use esta tela para remover seu acesso ao app e apagar os dados pessoais do seu perfil.
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>O que acontece quando você exclui a conta</Text>
                        <Text style={styles.cardItem}>Seu login deixa de funcionar imediatamente.</Text>
                        <Text style={styles.cardItem}>Foto, bio, chave PIX e dados de perfil são removidos.</Text>
                        <Text style={styles.cardItem}>Documentos de KYC do perfil são limpos.</Text>
                        <Text style={styles.cardItem}>Eventos ou reservas futuras precisam estar encerrados antes.</Text>
                        <Text style={styles.cardItem}>Seu saldo deve estar zerado para concluir a exclusão.</Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Digite {CONFIRMATION_TEXT} para confirmar</Text>
                        <TextInput
                            value={confirmationText}
                            onChangeText={setConfirmationText}
                            autoCapitalize="characters"
                            placeholder={CONFIRMATION_TEXT}
                            placeholderTextColor={Palette.subtle}
                            style={styles.input}
                            editable={!isDeleting}
                        />

                        <TouchableOpacity
                            style={[styles.deleteButton, (!canDelete || isDeleting) && styles.deleteButtonDisabled]}
                            onPress={handleDeleteAccount}
                            disabled={!canDelete || isDeleting}
                            accessibilityRole="button"
                            accessibilityLabel="Excluir minha conta"
                            accessibilityState={{ disabled: !canDelete || isDeleting, busy: isDeleting }}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.deleteButtonText}>Excluir minha conta</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAwareScrollView>
            </BrandSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    content: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl + Spacing.sm,
    },
    hero: {
        marginBottom: Spacing.xxl,
    },
    iconBadge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Palette.dangerLine,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Palette.ink,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 21,
        color: Palette.inkSoft,
    },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: 14,
        marginBottom: Spacing.lg,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.md,
    },
    cardItem: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginBottom: Spacing.sm,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Palette.inkSoft,
        marginBottom: 10,
    },
    input: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: Palette.dangerLine,
        borderRadius: BorderRadius.lg,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 16,
        color: Palette.ink,
        marginBottom: Spacing.lg,
    },
    deleteButton: {
        minHeight: 52,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.danger,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    deleteButtonDisabled: {
        opacity: 0.5,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
