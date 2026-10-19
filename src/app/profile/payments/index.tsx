import { BillingWallet, paymentService } from '@/services/api/PaymentService';
import { supabase } from '@/shared/lib/supabase';
import { displayCardBrand, formatCpf, formatPhone, formatPostalCode, onlyDigits } from '@/shared/lib/paymentValidation';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';
import { billingProfileSchema, firstError, validateForm } from '@/shared/lib/validation';

export default function PaymentsProfileScreen() {
    const router = useRouter();
    const { eventId, bookingId, mode } = useLocalSearchParams<{
        eventId?: string;
        bookingId?: string;
        mode?: 'pix' | 'card';
    }>();
    const [wallet, setWallet] = useState<BillingWallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
    const [email, setEmail] = useState('');
    const [mobilePhone, setMobilePhone] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressComplement, setAddressComplement] = useState('');

    const loadWallet = useCallback(async () => {
        setLoading(true);
        try {
            const [billingWallet, sessionResult] = await Promise.all([
                paymentService.getWallet(),
                supabase.auth.getSession(),
            ]);
            const profile = billingWallet.profile;
            const session = sessionResult.data.session;
            setWallet(billingWallet);
            setFullName(profile?.fullName || session?.user.user_metadata?.full_name || '');
            setCpf(formatCpf(profile?.cpfCnpj || ''));
            setEmail(profile?.email || session?.user.email || '');
            setMobilePhone(formatPhone(profile?.mobilePhone || ''));
            setPostalCode(formatPostalCode(profile?.postalCode || ''));
            setAddressNumber(profile?.addressNumber || '');
            setAddressComplement(profile?.addressComplement || '');
        } catch (error: any) {
            Alert.alert('Erro', friendlyErrorMessage(error, 'Não foi possível carregar seus pagamentos.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        void loadWallet();
    }, [loadWallet]));

    const continueToCheckout = (target: 'pix' | 'card') => {
        if (!eventId || !bookingId) return false;
        if (target === 'card') {
            router.replace({
                pathname: '/profile/payments/card',
                params: { eventId: String(eventId), bookingId: String(bookingId) },
            } as any);
        } else {
            router.replace({
                pathname: '/events/[id]/payment',
                params: { id: String(eventId), bookingId: String(bookingId) },
            } as any);
        }
        return true;
    };

    const saveProfile = async () => {
        const validation = validateForm(billingProfileSchema(mode === 'card'), {
            fullName,
            cpf,
            email,
            mobilePhone,
            postalCode,
            addressNumber,
        });
        if (!validation.success) {
            Alert.alert('Revise os dados', firstError(validation.errors));
            return;
        }
        setSaving(true);
        try {
            await paymentService.saveBillingProfile({
                fullName: validation.data.fullName,
                cpfCnpj: onlyDigits(cpf),
                email: validation.data.email,
                mobilePhone: onlyDigits(mobilePhone),
                postalCode: onlyDigits(postalCode) || undefined,
                addressNumber: addressNumber.trim() || undefined,
                addressComplement: addressComplement.trim() || undefined,
            });
            if (mode && continueToCheckout(mode)) return;
            Alert.alert('Dados salvos', 'Seu perfil de cobrança foi atualizado.');
            await loadWallet();
        } catch (error: any) {
            Alert.alert('Não foi possível salvar', friendlyErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const deleteCard = (cardId: string, description: string) => {
        Alert.alert('Remover cartão', `Remover ${description} dos seus pagamentos?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await paymentService.deleteCard(cardId);
                        await loadWallet();
                    } catch (error: any) {
                        Alert.alert('Erro', friendlyErrorMessage(error));
                    }
                },
            },
        ]);
    };

    const setDefault = async (cardId: string) => {
        try {
            await paymentService.setDefaultCard(cardId);
            await loadWallet();
        } catch (error: any) {
            Alert.alert('Erro', friendlyErrorMessage(error));
        }
    };

    if (loading) {
        return (
            <View style={styles.screen}>
                <BrandStackHeader eyebrow="FINANCEIRO" title="Pagamentos" />
                <BrandSheet>
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                </BrandSheet>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <BrandStackHeader eyebrow="FINANCEIRO" title="Pagamentos" />

            <BrandSheet>
                <KeyboardAwareScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid
                    extraScrollHeight={32}
                >
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIcon}>
                                <Ionicons name="person-outline" size={21} color={Palette.orangeDeep} />
                            </View>
                            <View style={styles.flexText}>
                                <Text style={styles.sectionTitle}>Dados de cobrança</Text>
                                <Text style={styles.sectionSubtitle}>Informações privadas usadas apenas nos pagamentos.</Text>
                            </View>
                        </View>

                        <Field label="Nome completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                        <Field label="CPF" value={cpf} onChangeText={(value) => setCpf(formatCpf(value))} keyboardType="number-pad" />
                        <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <Field
                            label="Celular"
                            value={mobilePhone}
                            onChangeText={(value) => setMobilePhone(formatPhone(value))}
                            keyboardType="phone-pad"
                        />

                        <View style={styles.addressTitleRow}>
                            <Text style={styles.addressTitle}>Endereço para cartão</Text>
                            <Text style={styles.optionalLabel}>Necessário para cartão</Text>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.postalField}>
                                <Field
                                    label="CEP"
                                    value={postalCode}
                                    onChangeText={(value) => setPostalCode(formatPostalCode(value))}
                                    keyboardType="number-pad"
                                />
                            </View>
                            <View style={styles.numberField}>
                                <Field label="Número" value={addressNumber} onChangeText={setAddressNumber} keyboardType="number-pad" />
                            </View>
                        </View>
                        <Field label="Complemento (opcional)" value={addressComplement} onChangeText={setAddressComplement} />

                        <TouchableOpacity
                            style={[styles.primaryButton, saving && styles.buttonDisabled]}
                            onPress={saveProfile}
                            disabled={saving}
                            accessibilityRole="button"
                            accessibilityLabel={mode ? 'Salvar e continuar' : 'Salvar dados'}
                            accessibilityState={{ disabled: saving, busy: saving }}
                        >
                            {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                                <>
                                    <Ionicons name="checkmark" size={21} color="#FFFFFF" />
                                    <Text style={styles.primaryButtonText}>{mode ? 'Salvar e continuar' : 'Salvar dados'}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIcon, styles.blueIcon]}>
                                <Ionicons name="card-outline" size={21} color={Palette.blue} />
                            </View>
                            <View style={styles.flexText}>
                                <Text style={styles.sectionTitle}>Cartões salvos</Text>
                                <Text style={styles.sectionSubtitle}>Somente bandeira, final e token seguro ficam registrados.</Text>
                            </View>
                        </View>

                        {wallet?.cards.map((card) => {
                            const description = `${displayCardBrand(card.brand)} final ${card.lastFour}`;
                            return (
                                <View key={card.id} style={styles.cardRow}>
                                    <View style={styles.cardVisual}>
                                        <Ionicons name="card" size={22} color={Palette.blue} />
                                    </View>
                                    <View style={styles.flexText}>
                                        <Text style={styles.cardTitle}>{description}</Text>
                                        <View style={styles.cardMetaRow}>
                                            <Text style={styles.cardSubtitle}>
                                                {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                                            </Text>
                                            {card.isDefault && (
                                                <View style={styles.defaultPill}>
                                                    <Text style={styles.defaultPillText}>PADRÃO</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    {!card.isDefault && (
                                        <TouchableOpacity
                                            style={styles.smallIconButton}
                                            onPress={() => void setDefault(card.id)}
                                            accessibilityRole="button"
                                            accessibilityLabel="Definir como padrão"
                                        >
                                            <Ionicons name="star-outline" size={21} color={Palette.star} />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={styles.smallIconButton}
                                        onPress={() => deleteCard(card.id, description)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Remover cartão"
                                    >
                                        <Ionicons name="trash-outline" size={20} color={Palette.danger} />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        <TouchableOpacity
                            style={styles.addButton}
                            accessibilityRole="button"
                            onPress={() => {
                                if (!wallet?.cardReady) {
                                    Alert.alert('Complete o endereço', 'Salve CEP e número antes de adicionar um cartão.');
                                    return;
                                }
                                router.push('/profile/payments/card' as any);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={22} color={Palette.ink} />
                            <Text style={styles.addButtonText}>Adicionar cartão</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.securityRow}>
                        <Ionicons name="shield-checkmark-outline" size={19} color={Palette.muted} />
                        <Text style={styles.securityText}>O Wellcome nunca armazena número completo ou código de segurança.</Text>
                    </View>
                </KeyboardAwareScrollView>
            </BrandSheet>
        </View>
    );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
    const { label, ...inputProps } = props;
    return (
        <View style={styles.fieldBlock}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                {...inputProps}
                style={styles.input}
                placeholderTextColor={Palette.subtle}
                selectionColor={Palette.orange}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.paper },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: Spacing.xl, paddingBottom: 44, gap: Spacing.lg },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: 14,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
    sectionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.orangeSoft, alignItems: 'center', justifyContent: 'center' },
    blueIcon: { backgroundColor: Palette.blueSoft },
    flexText: { flex: 1 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: Palette.ink },
    sectionSubtitle: { fontSize: 13, lineHeight: 18, color: Palette.inkSoft, marginTop: 2 },
    fieldBlock: { marginBottom: 15 },
    label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: Palette.inkSoft, marginBottom: Spacing.sm },
    input: { minHeight: 48, borderWidth: 1, borderColor: Palette.line, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, fontSize: 16, color: Palette.ink, backgroundColor: Palette.surface },
    addressTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm, marginBottom: Spacing.md },
    addressTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    optionalLabel: { fontSize: 12, color: Palette.muted },
    row: { flexDirection: 'row', gap: Spacing.md },
    postalField: { flex: 1.25 },
    numberField: { flex: 0.75 },
    primaryButton: { minHeight: 52, borderRadius: BorderRadius.full, backgroundColor: Palette.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
    buttonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    cardRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: Palette.lineSoft },
    cardVisual: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Palette.blueSoft, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 3 },
    cardSubtitle: { fontSize: 13, color: Palette.inkSoft },
    defaultPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, backgroundColor: Palette.greenSoft },
    defaultPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: Palette.green },
    smallIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    addButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: Palette.line, borderRadius: BorderRadius.full, marginTop: Spacing.lg, backgroundColor: Palette.surface },
    addButtonText: { color: Palette.ink, fontSize: 15, fontWeight: '800' },
    securityRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, paddingHorizontal: Spacing.xs },
    securityText: { flex: 1, fontSize: 12, lineHeight: 17, color: Palette.muted },
});
