import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
            'Essa acao e permanente. Seu acesso sera removido e os dados pessoais do perfil serao anonimizados.',
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

                            Alert.alert('Conta excluida', 'Sua conta foi removida com sucesso.', [
                                {
                                    text: 'OK',
                                    onPress: () => router.replace('/auth/login'),
                                }
                            ]);
                        } catch (error: any) {
                            Alert.alert('Nao foi possivel excluir', error?.message || 'Tente novamente em alguns minutos.');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ],
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAwareScrollView contentContainerStyle={styles.content}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={20} color="#111" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>

                <View style={styles.hero}>
                    <View style={styles.iconBadge}>
                        <Ionicons name="trash-outline" size={28} color="#FF3B30" />
                    </View>
                    <Text style={styles.title}>Excluir conta</Text>
                    <Text style={styles.subtitle}>
                        Use esta tela para remover seu acesso ao app e apagar os dados pessoais do seu perfil.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>O que acontece quando voce exclui a conta</Text>
                    <Text style={styles.cardItem}>Seu login deixa de funcionar imediatamente.</Text>
                    <Text style={styles.cardItem}>Foto, bio, chave PIX e dados de perfil sao removidos.</Text>
                    <Text style={styles.cardItem}>Documentos de KYC do perfil sao limpos.</Text>
                    <Text style={styles.cardItem}>Eventos ou reservas futuras precisam estar encerrados antes.</Text>
                    <Text style={styles.cardItem}>Seu saldo deve estar zerado para concluir a exclusao.</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.inputLabel}>Digite {CONFIRMATION_TEXT} para confirmar</Text>
                    <TextInput
                        value={confirmationText}
                        onChangeText={setConfirmationText}
                        autoCapitalize="characters"
                        placeholder={CONFIRMATION_TEXT}
                        placeholderTextColor="#999"
                        style={styles.input}
                        editable={!isDeleting}
                    />

                    <TouchableOpacity
                        style={[styles.deleteButton, (!canDelete || isDeleting) && styles.deleteButtonDisabled]}
                        onPress={handleDeleteAccount}
                        disabled={!canDelete || isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={18} color="#fff" />
                                <Text style={styles.deleteButtonText}>Excluir minha conta</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF7F5',
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 40,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    backText: {
        color: '#111',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 4,
    },
    hero: {
        marginBottom: 24,
    },
    iconBadge: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#FFE9E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: '#555',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
        marginBottom: 12,
    },
    cardItem: {
        fontSize: 14,
        lineHeight: 21,
        color: '#555',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#F2C6C1',
        borderRadius: 14,
        backgroundColor: '#FFF8F7',
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111',
        marginBottom: 16,
    },
    deleteButton: {
        height: 52,
        borderRadius: 16,
        backgroundColor: '#FF3B30',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    deleteButtonDisabled: {
        opacity: 0.5,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
