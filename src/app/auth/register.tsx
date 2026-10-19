import { authService } from '@/services/api/AuthService';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { GoogleLogo } from '@/components/ui/GoogleLogo';
import { makeRedirectUri } from 'expo-auth-session';
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';
import { FieldErrors, registerSchema, validateForm } from '@/shared/lib/validation';

type RegisterField = 'name' | 'email' | 'phoneNumber' | 'password' | 'confirmPassword' | 'acceptedTerms';

WebBrowser.maybeCompleteAuthSession();

const LEGAL_TERMS_VERSION = '2026-08-23';

export default function RegisterScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [errors, setErrors] = useState<FieldErrors<Record<RegisterField, unknown>>>({});

    function clearError(field: RegisterField) {
        if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    }

    async function signUpWithEmail() {
        const validation = validateForm(registerSchema, {
            name,
            email,
            phoneNumber,
            password,
            confirmPassword,
            acceptedTerms,
        });
        if (!validation.success) {
            setErrors(validation.errors);
            return;
        }
        setErrors({});

        const values = validation.data;
        setLoading(true);
        try {
            const data = await authService.register(values.email, values.password, values.name, values.phoneNumber, values.acceptedTerms);

            if (data?.session) {
                const { error } = await supabase.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                });
                if (error) {
                    Alert.alert('Sucesso', 'Cadastro realizado! Faça login para continuar.');
                    router.replace('/auth/login');
                }
            } else {
                Alert.alert('Sucesso', 'Verifique seu e-mail para confirmar o cadastro!');
                router.replace('/auth/login');
            }

        } catch (error) {
            Alert.alert('Não foi possível criar sua conta', friendlyErrorMessage(error, 'Confira os dados informados e tente novamente.'));
        }
        setLoading(false);
    }

    async function signInWithGoogle() {
        if (!acceptedTerms) {
            Alert.alert('Aceite necessário', 'Leia e aceite os Termos de Uso e a Política de Privacidade para continuar.');
            return;
        }

        setLoading(true);
        try {
            const redirectUri = makeRedirectUri({
                scheme: 'wellcome',
                path: 'auth/callback',
            });

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

                if (result.type === 'success' && result.url) {
                    const params = new URLSearchParams(result.url.split('#')[1]);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        if (error) throw error;

                        const { error: metadataError } = await supabase.auth.updateUser({
                            data: {
                                terms_accepted_at: new Date().toISOString(),
                                terms_version: LEGAL_TERMS_VERSION,
                            },
                        });
                        if (metadataError) throw metadataError;
                    }
                }
            }
        } catch (error) {
            Alert.alert('Não foi possível entrar com o Google', friendlyErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.screen}>
            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
                style={styles.container}
            >
                <BrandStackHeader eyebrow="CRIAR CONTA" title="Cadastro" onBack={() => router.back()} />

                <BrandSheet>
                    <View style={styles.content}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.mainTitle}>Seja bem-vindo(a) à WellCome!</Text>
                            <Text style={styles.subtitle}>
                                Crie ou participe de experiências gastronômicas e compartilhe bons momentos à mesa.
                            </Text>
                        </View>

                        <View style={styles.formContainer}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nome completo</Text>
                                <TextInput
                                    style={[styles.input, errors.name && styles.inputError]}
                                    placeholder="Seu nome"
                                    placeholderTextColor={Palette.subtle}
                                    value={name}
                                    onChangeText={(value) => {
                                        setName(value);
                                        clearError('name');
                                    }}
                                    autoComplete="name"
                                    accessibilityLabel="Nome completo"
                                />
                                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>E-mail</Text>
                                <TextInput
                                    style={[styles.input, errors.email && styles.inputError]}
                                    placeholder="email@email.com"
                                    placeholderTextColor={Palette.subtle}
                                    value={email}
                                    onChangeText={(value) => {
                                        setEmail(value);
                                        clearError('email');
                                    }}
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    keyboardType="email-address"
                                    accessibilityLabel="E-mail"
                                />
                                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>WhatsApp / Telefone</Text>
                                <TextInput
                                    style={[styles.input, errors.phoneNumber && styles.inputError]}
                                    placeholder="(11) 99999-9999"
                                    placeholderTextColor={Palette.subtle}
                                    value={phoneNumber}
                                    onChangeText={(value) => {
                                        setPhoneNumber(value);
                                        clearError('phoneNumber');
                                    }}
                                    keyboardType="phone-pad"
                                    accessibilityLabel="WhatsApp / Telefone"
                                />
                                {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Senha</Text>
                                <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder=""
                                        placeholderTextColor={Palette.subtle}
                                        value={password}
                                        onChangeText={(value) => {
                                            setPassword(value);
                                            clearError('password');
                                        }}
                                        secureTextEntry={!showPassword}
                                        accessibilityLabel="Senha"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                        accessibilityRole="button"
                                        accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={Palette.muted}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Repita sua senha</Text>
                                <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder=""
                                        placeholderTextColor={Palette.subtle}
                                        value={confirmPassword}
                                        onChangeText={(value) => {
                                            setConfirmPassword(value);
                                            clearError('confirmPassword');
                                        }}
                                        secureTextEntry={!showConfirmPassword}
                                        accessibilityLabel="Repita sua senha"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeButton}
                                        accessibilityRole="button"
                                        accessibilityLabel={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={22}
                                            color={Palette.muted}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                            </View>

                            <View style={styles.termsContainer}>
                                <TouchableOpacity
                                    style={styles.checkboxTouchTarget}
                                    onPress={() => setAcceptedTerms((current) => !current)}
                                    accessibilityRole="checkbox"
                                    accessibilityLabel="Aceito os Termos de Uso e a Política de Privacidade"
                                    accessibilityState={{ checked: acceptedTerms }}
                                >
                                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                                        {acceptedTerms && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.termsCopy}>
                                    <Text style={styles.termsText}>Li e aceito os documentos obrigatórios:</Text>
                                    <View style={styles.termsLinks}>
                                        <TouchableOpacity
                                            style={styles.termsLinkTouchTarget}
                                            onPress={() => router.push('/legal/terms' as any)}
                                            accessibilityRole="link"
                                        >
                                            <Text style={styles.termsLink}>Termos de Uso</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.termsText}> e </Text>
                                        <TouchableOpacity
                                            style={styles.termsLinkTouchTarget}
                                            onPress={() => router.push('/legal/privacy' as any)}
                                            accessibilityRole="link"
                                        >
                                            <Text style={styles.termsLink}>Política de Privacidade</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.registerButton, (!acceptedTerms || loading) && styles.buttonDisabled]}
                                onPress={signUpWithEmail}
                                disabled={loading || !acceptedTerms}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: loading || !acceptedTerms, busy: loading }}
                            >
                                <Text style={styles.registerButtonText}>
                                    {loading ? 'Criando...' : 'Criar cadastro'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>ou</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity
                                style={[styles.socialButton, (!acceptedTerms || loading) && styles.buttonDisabled]}
                                onPress={signInWithGoogle}
                                disabled={loading || !acceptedTerms}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: loading || !acceptedTerms }}
                            >
                                <GoogleLogo size={20} />
                                <Text style={styles.socialButtonText}>Cadastrar com Google</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Já tem uma conta? </Text>
                            <Link href="/auth/login" asChild>
                                <TouchableOpacity accessibilityRole="button" hitSlop={8}>
                                    <Text style={styles.loginText}>Entre</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </BrandSheet>
            </KeyboardAwareScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xxxl,
    },
    titleContainer: {
        marginBottom: Spacing.xl,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        color: Palette.inkSoft,
        lineHeight: 21,
    },
    formContainer: {
        marginBottom: Spacing.xxl,
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.xl,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Palette.inkSoft,
        marginBottom: Spacing.sm,
    },
    input: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 16,
        color: Palette.ink,
    },
    inputError: {
        borderColor: Palette.danger,
    },
    errorText: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 18,
        color: Palette.danger,
        fontWeight: '600',
    },
    passwordContainer: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        backgroundColor: Palette.surface,
        paddingLeft: Spacing.lg,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: 16,
        color: Palette.ink,
    },
    eyeButton: {
        width: 48,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    registerButton: {
        minHeight: 52,
        backgroundColor: Palette.orange,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        marginTop: Spacing.sm,
    },
    buttonDisabled: {
        opacity: 0.45,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 1.5,
        borderColor: Palette.subtle,
        borderRadius: 7,
        backgroundColor: Palette.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxTouchTarget: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
        marginLeft: -10,
    },
    checkboxChecked: {
        borderColor: Palette.orange,
        backgroundColor: Palette.orange,
    },
    termsCopy: {
        flex: 1,
        paddingTop: 2,
    },
    termsLinks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    termsLinkTouchTarget: {
        minHeight: 44,
        justifyContent: 'center',
    },
    termsText: {
        color: Palette.inkSoft,
        fontSize: 13,
        lineHeight: 19,
    },
    termsLink: {
        color: Palette.orangeDeep,
        fontSize: 13,
        fontWeight: '800',
        lineHeight: 19,
        textDecorationLine: 'underline',
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Palette.line,
    },
    dividerText: {
        marginHorizontal: Spacing.lg,
        color: Palette.muted,
        fontSize: 13,
        fontWeight: '700',
    },
    socialButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.surface,
    },
    socialButtonText: {
        marginLeft: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
        fontWeight: '800',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
    },
    footerText: {
        color: Palette.inkSoft,
        fontSize: 14,
    },
    loginText: {
        color: Palette.orangeDeep,
        fontSize: 14,
        fontWeight: '800',
    },
});
