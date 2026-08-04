import { BillingWallet, paymentService } from '@/services/api/PaymentService';
import { supabase } from '@/shared/lib/supabase';
import { displayCardBrand, formatCpf, formatPhone, formatPostalCode, onlyDigits } from '@/shared/lib/paymentValidation';
import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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
            Alert.alert('Erro', error.message || 'Nao foi possivel carregar seus pagamentos.');
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
        if (mode === 'card' && (!onlyDigits(postalCode) || !addressNumber.trim())) {
            Alert.alert('Endereco necessario', 'Informe CEP e numero para cadastrar um cartao.');
            return;
        }
        setSaving(true);
        try {
            await paymentService.saveBillingProfile({
                fullName,
                cpfCnpj: onlyDigits(cpf),
                email,
                mobilePhone: onlyDigits(mobilePhone),
                postalCode: onlyDigits(postalCode) || undefined,
                addressNumber: addressNumber.trim() || undefined,
                addressComplement: addressComplement.trim() || undefined,
            });
            if (mode && continueToCheckout(mode)) return;
            Alert.alert('Dados salvos', 'Seu perfil de cobranca foi atualizado.');
            await loadWallet();
        } catch (error: any) {
            Alert.alert('Nao foi possivel salvar', error.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteCard = (cardId: string, description: string) => {
        Alert.alert('Remover cartao', `Remover ${description} dos seus pagamentos?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await paymentService.deleteCard(cardId);
                        await loadWallet();
                    } catch (error: any) {
                        Alert.alert('Erro', error.message);
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
            Alert.alert('Erro', error.message);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#E56F2D" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Voltar">
                    <Ionicons name="chevron-back" size={25} color="#202124" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pagamentos</Text>
                <View style={styles.iconButton} />
            </View>

            <KeyboardAwareScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                extraScrollHeight={32}
            >
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionIcon}>
                        <Ionicons name="person-outline" size={21} color="#E56F2D" />
                    </View>
                    <View style={styles.flexText}>
                        <Text style={styles.sectionTitle}>Dados de cobranca</Text>
                        <Text style={styles.sectionSubtitle}>Informacoes privadas usadas apenas nos pagamentos.</Text>
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
                    <Text style={styles.addressTitle}>Endereco para cartao</Text>
                    <Text style={styles.optionalLabel}>Necessario para cartao</Text>
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
                        <Field label="Numero" value={addressNumber} onChangeText={setAddressNumber} keyboardType="number-pad" />
                    </View>
                </View>
                <Field label="Complemento (opcional)" value={addressComplement} onChangeText={setAddressComplement} />

                <TouchableOpacity style={styles.primaryButton} onPress={saveProfile} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                        <>
                            <Ionicons name="checkmark" size={21} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>{mode ? 'Salvar e continuar' : 'Salvar dados'}</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIcon, styles.blueIcon]}>
                        <Ionicons name="card-outline" size={21} color="#315E9E" />
                    </View>
                    <View style={styles.flexText}>
                        <Text style={styles.sectionTitle}>Cartoes salvos</Text>
                        <Text style={styles.sectionSubtitle}>Somente bandeira, final e token seguro ficam registrados.</Text>
                    </View>
                </View>

                {wallet?.cards.map((card) => {
                    const description = `${displayCardBrand(card.brand)} final ${card.lastFour}`;
                    return (
                        <View key={card.id} style={styles.cardRow}>
                            <View style={styles.cardVisual}>
                                <Ionicons name="card" size={22} color="#315E9E" />
                            </View>
                            <View style={styles.flexText}>
                                <Text style={styles.cardTitle}>{description}</Text>
                                <Text style={styles.cardSubtitle}>
                                    {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                                    {card.isDefault ? '  Padrao' : ''}
                                </Text>
                            </View>
                            {!card.isDefault && (
                                <TouchableOpacity
                                    style={styles.smallIconButton}
                                    onPress={() => void setDefault(card.id)}
                                    accessibilityLabel="Definir como padrao"
                                >
                                    <Ionicons name="star-outline" size={21} color="#A66B00" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.smallIconButton}
                                onPress={() => deleteCard(card.id, description)}
                                accessibilityLabel="Remover cartao"
                            >
                                <Ionicons name="trash-outline" size={20} color="#C43D37" />
                            </TouchableOpacity>
                        </View>
                    );
                })}

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        if (!wallet?.cardReady) {
                            Alert.alert('Complete o endereco', 'Salve CEP e numero antes de adicionar um cartao.');
                            return;
                        }
                        router.push('/profile/payments/card' as any);
                    }}
                >
                    <Ionicons name="add-circle-outline" size={22} color="#315E9E" />
                    <Text style={styles.addButtonText}>Adicionar cartao</Text>
                </TouchableOpacity>

                <View style={styles.securityRow}>
                    <Ionicons name="shield-checkmark-outline" size={19} color="#5D646A" />
                    <Text style={styles.securityText}>O Wellcome nunca armazena numero completo ou codigo de seguranca.</Text>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
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
                placeholderTextColor="#9A9EA3"
                selectionColor="#E56F2D"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12,
        paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E4E7',
    },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#202124' },
    content: { padding: 20, paddingBottom: 44 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    sectionIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center' },
    blueIcon: { backgroundColor: '#EDF3FB' },
    flexText: { flex: 1 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#202124' },
    sectionSubtitle: { fontSize: 13, lineHeight: 18, color: '#71767C', marginTop: 2 },
    fieldBlock: { marginBottom: 15 },
    label: { fontSize: 13, fontWeight: '700', color: '#4B5055', marginBottom: 7 },
    input: { height: 50, borderWidth: 1, borderColor: '#D9DDE1', borderRadius: 8, paddingHorizontal: 14, fontSize: 16, color: '#202124', backgroundColor: '#FFFFFF' },
    addressTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
    addressTitle: { fontSize: 15, fontWeight: '800', color: '#202124' },
    optionalLabel: { fontSize: 12, color: '#7A6060' },
    row: { flexDirection: 'row', gap: 12 },
    postalField: { flex: 1.25 },
    numberField: { flex: 0.75 },
    primaryButton: { minHeight: 52, borderRadius: 8, backgroundColor: '#E56F2D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#E8EAEC', marginVertical: 30 },
    cardRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E3E6' },
    cardVisual: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EDF3FB', alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#202124' },
    cardSubtitle: { fontSize: 13, color: '#747980', marginTop: 3 },
    smallIconButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
    addButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#B7C8DE', borderRadius: 8, marginTop: 18 },
    addButtonText: { color: '#315E9E', fontSize: 15, fontWeight: '700' },
    securityRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 8, marginTop: 24 },
    securityText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#5D646A' },
});
