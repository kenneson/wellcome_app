import { paymentService } from '@/services/api/PaymentService';
import { detectCardBrand, formatCardNumber, onlyDigits } from '@/shared/lib/paymentValidation';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddPaymentCardScreen() {
    const router = useRouter();
    const { eventId, bookingId } = useLocalSearchParams<{ eventId?: string; bookingId?: string }>();
    const [checkingProfile, setCheckingProfile] = useState(true);
    const [saving, setSaving] = useState(false);
    const [holderName, setHolderName] = useState('');
    const [number, setNumber] = useState('');
    const [expiryMonth, setExpiryMonth] = useState('');
    const [expiryYear, setExpiryYear] = useState('');
    const [ccv, setCcv] = useState('');
    const [isDefault, setIsDefault] = useState(true);

    useEffect(() => {
        paymentService.getWallet()
            .then((wallet) => {
                if (!wallet.cardReady) {
                    Alert.alert('Complete seus dados', 'Informe CEP e numero antes de cadastrar um cartao.', [
                        { text: 'Continuar', onPress: () => router.replace('/profile/payments' as any) },
                    ]);
                }
            })
            .catch((error) => Alert.alert('Erro', error.message))
            .finally(() => setCheckingProfile(false));
    }, [router]);

    const saveCard = async () => {
        const month = Number(expiryMonth);
        let year = Number(expiryYear);
        if (expiryYear.length === 2) year += 2000;

        setSaving(true);
        try {
            await paymentService.addCard({
                holderName,
                number: onlyDigits(number),
                expiryMonth: month,
                expiryYear: year,
                ccv: onlyDigits(ccv),
                isDefault,
            });

            setNumber('');
            setCcv('');
            setExpiryMonth('');
            setExpiryYear('');

            if (eventId && bookingId) {
                router.replace({
                    pathname: '/events/[id]/payment',
                    params: { id: String(eventId), bookingId: String(bookingId) },
                } as any);
                return;
            }
            Alert.alert('Cartao adicionado', 'O cartao ja pode ser usado nos pagamentos.', [
                { text: 'OK', onPress: () => router.replace('/profile/payments' as any) },
            ]);
        } catch (error: any) {
            setNumber('');
            setCcv('');
            Alert.alert('Nao foi possivel cadastrar', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (checkingProfile) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.center}><ActivityIndicator size="large" color="#E56F2D" /></View>
            </SafeAreaView>
        );
    }

    const brand = detectCardBrand(number);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Voltar">
                    <Ionicons name="chevron-back" size={25} color="#202124" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Adicionar cartao</Text>
                <View style={styles.iconButton} />
            </View>

            <KeyboardAwareScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid
                extraScrollHeight={36}
            >
                <View style={styles.brandRow}>
                    <View style={styles.cardIcon}>
                        <Ionicons name="card" size={27} color="#315E9E" />
                    </View>
                    <View>
                        <Text style={styles.brandTitle}>{brand}</Text>
                        <Text style={styles.brandSubtitle}>Tokenizacao segura pelo Asaas</Text>
                    </View>
                </View>

                <Field label="Nome impresso no cartao" value={holderName} onChangeText={setHolderName} autoCapitalize="characters" />
                <Field
                    label="Numero do cartao"
                    value={number}
                    onChangeText={(value) => setNumber(formatCardNumber(value))}
                    keyboardType="number-pad"
                    textContentType="creditCardNumber"
                />

                <View style={styles.row}>
                    <View style={styles.smallField}>
                        <Field
                            label="Mes"
                            value={expiryMonth}
                            onChangeText={(value) => setExpiryMonth(onlyDigits(value).slice(0, 2))}
                            keyboardType="number-pad"
                            placeholder="MM"
                        />
                    </View>
                    <View style={styles.smallField}>
                        <Field
                            label="Ano"
                            value={expiryYear}
                            onChangeText={(value) => setExpiryYear(onlyDigits(value).slice(0, 4))}
                            keyboardType="number-pad"
                            placeholder="AAAA"
                        />
                    </View>
                    <View style={styles.smallField}>
                        <Field
                            label="CVV"
                            value={ccv}
                            onChangeText={(value) => setCcv(onlyDigits(value).slice(0, 4))}
                            keyboardType="number-pad"
                            secureTextEntry
                            placeholder="***"
                        />
                    </View>
                </View>

                <View style={styles.defaultRow}>
                    <View style={styles.flexText}>
                        <Text style={styles.defaultTitle}>Usar como cartao padrao</Text>
                        <Text style={styles.defaultSubtitle}>Ele aparecera selecionado no proximo pagamento.</Text>
                    </View>
                    <Switch
                        value={isDefault}
                        onValueChange={setIsDefault}
                        trackColor={{ false: '#C8CDD2', true: '#F3A272' }}
                        thumbColor={isDefault ? '#E56F2D' : '#FFFFFF'}
                    />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={saveCard} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                        <>
                            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>Salvar cartao</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.securityRow}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#16855B" />
                    <Text style={styles.securityText}>
                        Numero e CVV sao enviados apenas para tokenizacao. O Wellcome nao armazena esses dados.
                    </Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E4E7' },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#202124' },
    content: { padding: 20, paddingBottom: 44 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 28 },
    cardIcon: { width: 50, height: 42, borderRadius: 8, backgroundColor: '#EDF3FB', alignItems: 'center', justifyContent: 'center' },
    brandTitle: { fontSize: 17, fontWeight: '800', color: '#202124' },
    brandSubtitle: { fontSize: 13, color: '#71767C', marginTop: 2 },
    fieldBlock: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '700', color: '#4B5055', marginBottom: 7 },
    input: { height: 51, borderWidth: 1, borderColor: '#D9DDE1', borderRadius: 8, paddingHorizontal: 14, fontSize: 16, color: '#202124', backgroundColor: '#FFFFFF' },
    row: { flexDirection: 'row', gap: 10 },
    smallField: { flex: 1 },
    defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, marginTop: 2 },
    flexText: { flex: 1 },
    defaultTitle: { fontSize: 15, fontWeight: '700', color: '#202124' },
    defaultSubtitle: { fontSize: 13, color: '#71767C', lineHeight: 18, marginTop: 2 },
    primaryButton: { minHeight: 52, borderRadius: 8, backgroundColor: '#E56F2D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    securityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#EFF8F3', borderRadius: 8, padding: 13, marginTop: 20 },
    securityText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#3E6453' },
});
