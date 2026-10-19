import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { userService } from '@/services/api/UserService';
import { getEventCreationReturnPath } from '@/features/create-event/model/payoutReturn';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';
import { validatePixKey } from '@/shared/lib/validation';
import { resetToLogin } from '@/shared/lib/navigation';

const PIX_KEY_TYPES = [
    { label: 'CPF', value: 'CPF' },
    { label: 'CNPJ', value: 'CNPJ' },
    { label: 'E-mail', value: 'EMAIL' },
    { label: 'Telefone', value: 'PHONE' },
    { label: 'Chave Aleatória', value: 'EVP' },
];

export default function PixKeyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ returnTo?: string | string[]; draftId?: string | string[] }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [pixKey, setPixKey] = useState('');
    const [pixKeyType, setPixKeyType] = useState('CPF');
    const returnPath = getEventCreationReturnPath(params.returnTo, params.draftId);

    const finish = () => returnPath ? router.dismissTo(returnPath as any) : router.back();

    async function loadCurrentKey() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { resetToLogin(); return; }
            setUserId(session.user.id);
            const profile = await userService.getProfile(session.user.id);
            if (profile.pixKey) setPixKey(profile.pixKey);
            if (profile.pixKeyType) setPixKeyType(profile.pixKeyType);
        } catch (e) {
            console.error('Error loading pix key:', e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
        loadCurrentKey();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
    }, []);

    async function savePixKey() {
        if (!userId) return;
        const pixKeyError = validatePixKey(pixKeyType, pixKey);
        if (pixKeyError) {
            Alert.alert('Atenção', pixKeyError);
            return;
        }
        setSaving(true);
        try {
            await userService.updateProfile(userId, {
                pix_key: pixKey.trim(),
                pix_key_type: pixKeyType,
            });
            Alert.alert('Sucesso!', 'Chave PIX salva com sucesso.', [
                { text: 'OK', onPress: finish }
            ]);
        } catch (e: any) {
            Alert.alert('Erro', friendlyErrorMessage(e, 'Não foi possível salvar a chave PIX.'));
        } finally {
            setSaving(false);
        }
    }

    const getPlaceholder = () => {
        switch (pixKeyType) {
            case 'CPF': return '000.000.000-00';
            case 'CNPJ': return '00.000.000/0000-00';
            case 'EMAIL': return 'seuemail@exemplo.com';
            case 'PHONE': return '+55 (11) 99999-9999';
            case 'EVP': return 'Chave aleatória (UUID)';
            default: return 'Sua chave PIX';
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <BrandStackHeader eyebrow="FINANCEIRO" title="Minha Chave PIX" onBack={finish} />
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
            <BrandStackHeader eyebrow="FINANCEIRO" title="Minha Chave PIX" onBack={finish} />

            <BrandSheet>
                <KeyboardAwareScrollView contentContainerStyle={styles.content}>
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle-outline" size={20} color={Palette.blue} />
                        <Text style={styles.infoText}>
                            Sua chave PIX será usada para receber os pagamentos das reservas confirmadas.
                        </Text>
                    </View>

                    {/* Key Type Selector */}
                    <Text style={styles.label}>Tipo de Chave</Text>
                    <View style={styles.typeGrid}>
                        {PIX_KEY_TYPES.map((type) => (
                            <TouchableOpacity
                                key={type.value}
                                style={[styles.typeButton, pixKeyType === type.value && styles.typeButtonActive]}
                                onPress={() => { setPixKeyType(type.value); setPixKey(''); }}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: pixKeyType === type.value }}
                            >
                                <Text style={[styles.typeButtonText, pixKeyType === type.value && styles.typeButtonTextActive]}>
                                    {type.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Key Input */}
                    <Text style={[styles.label, styles.labelSpaced]}>Chave PIX</Text>
                    <TextInput
                        style={styles.input}
                        value={pixKey}
                        onChangeText={setPixKey}
                        placeholder={getPlaceholder()}
                        placeholderTextColor={Palette.subtle}
                        autoCapitalize="none"
                        keyboardType={pixKeyType === 'PHONE' ? 'phone-pad' : 'default'}
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={savePixKey}
                        disabled={saving}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: saving, busy: saving }}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Salvar Chave PIX</Text>
                        )}
                    </TouchableOpacity>
                </KeyboardAwareScrollView>
            </BrandSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.paper },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: Spacing.xl },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Palette.blueSoft,
        borderRadius: 22,
        padding: 14,
        marginBottom: Spacing.xxl,
        gap: 10,
    },
    infoText: { flex: 1, fontSize: 14, color: Palette.blue, lineHeight: 21 },
    label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: Palette.inkSoft, marginBottom: 10 },
    labelSpaced: { marginTop: Spacing.xxl },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeButton: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    typeButtonActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
    typeButtonText: { fontSize: 14, color: Palette.inkSoft, fontWeight: '700' },
    typeButtonTextActive: { color: Palette.orangeDeep, fontWeight: '800' },
    input: {
        minHeight: 48,
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 16,
        color: Palette.ink,
        marginBottom: Spacing.xxl,
    },
    saveButton: {
        backgroundColor: Palette.orange,
        borderRadius: BorderRadius.full,
        minHeight: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
