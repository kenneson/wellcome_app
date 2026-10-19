import { paymentService } from '@/services/api/PaymentService';
import { detectCardBrand, formatCardNumber, onlyDigits } from '@/shared/lib/paymentValidation';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
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
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

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
                    Alert.alert('Complete seus dados', 'Informe CEP e número antes de cadastrar um cartão.', [
                        { text: 'Continuar', onPress: () => router.replace('/profile/payments' as any) },
                    ]);
                }
            })
            .catch((error) => Alert.alert('Erro', friendlyErrorMessage(error)))
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
            Alert.alert('Cartão adicionado', 'O cartão já pode ser usado nos pagamentos.', [
                { text: 'OK', onPress: () => router.replace('/profile/payments' as any) },
            ]);
        } catch (error: any) {
            setNumber('');
            setCcv('');
            Alert.alert('Não foi possível cadastrar', friendlyErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    if (checkingProfile) {
        return (
            <View style={styles.screen}>
                <BrandStackHeader eyebrow="PAGAMENTOS" title="Adicionar cartão" />
                <BrandSheet>
                    <View style={styles.center}><ActivityIndicator size="large" color={Palette.orange} /></View>
                </BrandSheet>
            </View>
        );
    }

    const brand = detectCardBrand(number);

    return (
        <View style={styles.screen}>
            <BrandStackHeader eyebrow="PAGAMENTOS" title="Adicionar cartão" />

            <BrandSheet>
                <KeyboardAwareScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    enableOnAndroid
                    extraScrollHeight={36}
                >
                    <View style={styles.card}>
                        <View style={styles.brandRow}>
                            <View style={styles.cardIcon}>
                                <Ionicons name="card" size={27} color={Palette.blue} />
                            </View>
                            <View>
                                <Text style={styles.brandTitle}>{brand}</Text>
                                <Text style={styles.brandSubtitle}>Tokenização segura pelo Asaas</Text>
                            </View>
                        </View>

                        <Field label="Nome impresso no cartão" value={holderName} onChangeText={setHolderName} autoCapitalize="characters" />
                        <Field
                            label="Número do cartão"
                            value={number}
                            onChangeText={(value) => setNumber(formatCardNumber(value))}
                            keyboardType="number-pad"
                            textContentType="creditCardNumber"
                        />

                        <View style={styles.row}>
                            <View style={styles.smallField}>
                                <Field
                                    label="Mês"
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
                                <Text style={styles.defaultTitle}>Usar como cartão padrão</Text>
                                <Text style={styles.defaultSubtitle}>Ele aparecerá selecionado no próximo pagamento.</Text>
                            </View>
                            <Switch
                                value={isDefault}
                                onValueChange={setIsDefault}
                                trackColor={{ false: Palette.track, true: Palette.orange }}
                                thumbColor={Palette.surface}
                                accessibilityLabel="Usar como cartão padrão"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, saving && styles.buttonDisabled]}
                        onPress={saveCard}
                        disabled={saving}
                        accessibilityRole="button"
                        accessibilityLabel="Salvar cartão"
                        accessibilityState={{ disabled: saving, busy: saving }}
                    >
                        {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                            <>
                                <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Salvar cartão</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.securityRow}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={Palette.green} />
                        <Text style={styles.securityText}>
                            Número e CVV são enviados apenas para tokenização. O Wellcome não armazena esses dados.
                        </Text>
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
    content: { padding: Spacing.xl, paddingBottom: 44 },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: 14,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: Spacing.xl },
    cardIcon: { width: 50, height: 42, borderRadius: BorderRadius.md, backgroundColor: Palette.blueSoft, alignItems: 'center', justifyContent: 'center' },
    brandTitle: { fontSize: 18, fontWeight: '800', color: Palette.ink },
    brandSubtitle: { fontSize: 13, color: Palette.inkSoft, marginTop: 2 },
    fieldBlock: { marginBottom: Spacing.lg },
    label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: Palette.inkSoft, marginBottom: Spacing.sm },
    input: { minHeight: 48, borderWidth: 1, borderColor: Palette.line, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, fontSize: 16, color: Palette.ink, backgroundColor: Palette.surface },
    row: { flexDirection: 'row', gap: 10 },
    smallField: { flex: 1 },
    defaultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.sm },
    flexText: { flex: 1 },
    defaultTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    defaultSubtitle: { fontSize: 13, color: Palette.inkSoft, lineHeight: 18, marginTop: 2 },
    primaryButton: { minHeight: 52, borderRadius: BorderRadius.full, backgroundColor: Palette.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.xl },
    buttonDisabled: { opacity: 0.6 },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
    securityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: Palette.greenSoft, borderRadius: BorderRadius.lg, padding: 14, marginTop: Spacing.xl },
    securityText: { flex: 1, fontSize: 12, lineHeight: 17, color: Palette.green },
});
