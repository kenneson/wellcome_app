import { authService } from '@/services/api/AuthService';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { GoogleLogo } from '@/components/ui/GoogleLogo';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
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
import { BrandHeader, BrandSheet } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';
import { FieldErrors, loginSchema, validateForm } from '@/shared/lib/validation';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors<{ email: string; password: string }>>({});

    async function signInWithEmail() {
        const validation = validateForm(loginSchema, { email, password });
        if (!validation.success) {
            setErrors(validation.errors);
            return;
        }
        setErrors({});
        setLoading(true);

        try {
            const data = await authService.login(validation.data.email, validation.data.password);

            if (data?.session) {
                const { error } = await supabase.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                });
                if (error) throw error;
            }
            // Navigation is handled by the auth listener in _layout
        } catch (error) {
            Alert.alert('Não foi possível entrar', friendlyErrorMessage(error, 'Confira seu e-mail e senha e tente novamente.'));
        }
        setLoading(false);
    }

    async function signInWithGoogle() {
        try {
            const redirectUri = Linking.createURL('/auth/callback');

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                throw error;
            }

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
                    }
                }
            }
        } catch (error) {
            Alert.alert('Não foi possível entrar com o Google', friendlyErrorMessage(error));
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
                contentContainerStyle={{ flexGrow: 1 }}
                style={styles.container}
            >
                <BrandHeader eyebrow="ACESSE SUA CONTA">
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/images/logo.png')}
                            style={styles.logoImage}
                            contentFit="contain"
                            tintColor="#FFFFFF"
                            accessibilityLabel="Seja bem-vindo a Wellcome"
                        />
                    </View>
                </BrandHeader>

                <BrandSheet>
                    <View style={styles.content}>
                        <View style={styles.formContainer}>
                            <Text style={styles.formTitle}>Entrar</Text>
                            <Text style={styles.formSubtitle}>Use seu e-mail e senha ou continue com o Google.</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>E-mail</Text>
                                <TextInput
                                    style={[styles.input, errors.email && styles.inputError]}
                                    placeholder="email@email.com"
                                    placeholderTextColor={Palette.subtle}
                                    value={email}
                                    onChangeText={(value) => {
                                        setEmail(value);
                                        if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                                    }}
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    keyboardType="email-address"
                                    accessibilityLabel="E-mail"
                                />
                                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
                                            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
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

                            <TouchableOpacity
                                style={[styles.loginButton, loading && styles.buttonDisabled]}
                                onPress={signInWithEmail}
                                disabled={loading}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: loading, busy: loading }}
                            >
                                <Text style={styles.loginButtonText}>
                                    {loading ? 'Carregando...' : 'Login'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>ou</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            <TouchableOpacity style={styles.socialButton} onPress={signInWithGoogle} accessibilityRole="button">
                                <GoogleLogo size={20} />
                                <Text style={styles.socialButtonText}>Continuar com Google</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Não tem uma conta? </Text>
                            <Link href="/auth/register" asChild>
                                <TouchableOpacity accessibilityRole="button" hitSlop={8}>
                                    <Text style={styles.signupText}>Faça seu cadastro</Text>
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
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xl,
        justifyContent: 'space-between',
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 96,
    },
    logoImage: {
        width: '75%',
        height: '100%',
    },
    formContainer: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.xl,
    },
    formTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Palette.ink,
    },
    formSubtitle: {
        marginTop: 4,
        marginBottom: Spacing.xl,
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
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
        paddingVertical: 10,
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
        paddingVertical: 10,
        fontSize: 16,
        color: Palette.ink,
    },
    eyeButton: {
        width: 48,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButton: {
        minHeight: 52,
        backgroundColor: Palette.orange,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.xs,
        marginBottom: Spacing.lg,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
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
        paddingTop: Spacing.xl,
    },
    footerText: {
        color: Palette.inkSoft,
        fontSize: 14,
    },
    signupText: {
        color: Palette.orangeDeep,
        fontSize: 14,
        fontWeight: '800',
    },
});
