import { adminService } from '@/services/api/AdminService';
import { supabase } from '@/shared/lib/supabase';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

WebBrowser.maybeCompleteAuthSession();

type LoginMethod = 'password' | 'google' | null;

function getLoginErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : '';

    if (/invalid login credentials/i.test(message)) {
        return 'E-mail ou senha invalidos. Se esta conta usa Google, entre pelo botao do Google.';
    }
    if (/email not confirmed/i.test(message)) {
        return 'Confirme o e-mail da conta antes de tentar novamente.';
    }
    if (/admin access is required/i.test(message)) {
        return 'Esta conta foi autenticada, mas ainda nao possui permissao ADMIN.';
    }
    if (/user profile not found/i.test(message)) {
        return 'A conta nao possui perfil operacional. Aplique a migration de perfis e conceda o papel ADMIN.';
    }
    if (/network|fetch failed|timed out/i.test(message)) {
        return 'Nao foi possivel falar com o servidor. Confira a conexao e tente novamente.';
    }

    return message || 'Nao foi possivel concluir o acesso administrativo.';
}

export default function AdminLoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState<LoginMethod>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const completeAdminSignIn = async () => {
        await adminService.getMe();
        router.replace('/admin' as any);
    };

    const handleFailure = async (error: unknown) => {
        await supabase.auth.signOut();
        setErrorMessage(getLoginErrorMessage(error));
    };

    const signInWithPassword = async () => {
        if (!email.trim() || !password) {
            setErrorMessage('Informe e-mail e senha para continuar.');
            return;
        }

        setErrorMessage('');
        setLoginMethod('password');
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (error) throw error;

            await completeAdminSignIn();
        } catch (error) {
            await handleFailure(error);
        } finally {
            setLoginMethod(null);
        }
    };

    const signInWithGoogle = async () => {
        setErrorMessage('');
        setLoginMethod('google');

        try {
            const redirectUri = Linking.createURL('/auth/callback');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                },
            });
            if (error) throw error;

            if (!data.url) {
                throw new Error('Nao foi possivel iniciar o login com Google.');
            }

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
            if (result.type !== 'success' || !result.url) {
                return;
            }

            const hashParams = new URLSearchParams(result.url.split('#')[1] || '');
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            if (!accessToken || !refreshToken) {
                throw new Error('O Google nao retornou uma sessao valida.');
            }

            const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;

            await completeAdminSignIn();
        } catch (error) {
            await handleFailure(error);
        } finally {
            setLoginMethod(null);
        }
    };

    const loading = loginMethod !== null;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.replace('/auth/login')}
                    style={styles.backButton}
                    accessibilityLabel="Voltar para login"
                >
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.brandBlock}>
                    <Text style={styles.brandLabel}>WELLCOME</Text>
                    <Text style={styles.brandTitle}>Operacao</Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                enableOnAndroid
                extraScrollHeight={28}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View entering={FadeInDown.duration(240)} style={styles.content}>
                    <View style={styles.sectionLead}>
                        <View style={styles.mark}>
                            <Ionicons name="shield-checkmark" size={28} color="#B45309" />
                        </View>
                        <Text style={styles.eyebrow}>AREA RESTRITA</Text>
                        <Text style={styles.title}>Acesso administrativo</Text>
                        <Text style={styles.subtitle}>Entre com uma conta autorizada para operar a plataforma.</Text>
                    </View>

                    <View style={styles.formSurface}>
                        {errorMessage ? (
                            <Animated.View entering={FadeInDown.duration(180)} style={styles.errorNotice} accessibilityLiveRegion="polite">
                                <Ionicons name="alert-circle" size={20} color="#B42318" />
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </Animated.View>
                        ) : null}

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>E-mail</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoComplete="email"
                                keyboardType="email-address"
                                placeholder="admin@wellcome.app"
                                placeholderTextColor="#8A8A8A"
                                editable={!loading}
                                returnKeyType="next"
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Senha</Text>
                            <View style={styles.passwordField}>
                                <TextInput
                                    style={styles.passwordInput}
                                    value={password}
                                    onChangeText={setPassword}
                                    autoComplete="current-password"
                                    secureTextEntry={!showPassword}
                                    placeholder="Sua senha"
                                    placeholderTextColor="#8A8A8A"
                                    editable={!loading}
                                    onSubmitEditing={signInWithPassword}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword((current) => !current)}
                                    style={styles.passwordToggle}
                                    accessibilityLabel="Mostrar ou ocultar senha"
                                    disabled={loading}
                                >
                                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color="#666666" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, loading && styles.disabled]}
                            onPress={signInWithPassword}
                            disabled={loading}
                        >
                            {loginMethod === 'password' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Entrar na operacao</Text>}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>ou</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={[styles.googleButton, loading && styles.disabled]}
                            onPress={signInWithGoogle}
                            disabled={loading}
                        >
                            {loginMethod === 'google' ? <ActivityIndicator color="#333333" /> : <>
                                <FontAwesome name="google" size={20} color="#DB4437" />
                                <Text style={styles.googleButtonText}>Continuar com Google</Text>
                            </>}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#FFF8F3' },
    header: { minHeight: 116, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FF8C42', flexDirection: 'row', alignItems: 'flex-end' },
    backButton: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
    brandBlock: { flex: 1, alignItems: 'center', paddingBottom: 2 },
    brandLabel: { color: '#FFE3CF', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
    brandTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginTop: 3 },
    headerSpacer: { width: 44, height: 44 },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 30 },
    content: { width: '100%', maxWidth: 520, alignSelf: 'center' },
    sectionLead: { marginBottom: 24 },
    mark: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#FFF0E4', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    eyebrow: { color: '#B45309', fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 7 },
    title: { color: '#242424', fontSize: 27, fontWeight: '700', lineHeight: 33 },
    subtitle: { color: '#68615D', fontSize: 15, lineHeight: 22, marginTop: 8, maxWidth: 390 },
    formSurface: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0E0D5', borderRadius: 8, padding: 18 },
    errorNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#FFF1F1', borderLeftWidth: 3, borderLeftColor: '#B42318', padding: 12, borderRadius: 6, marginBottom: 18 },
    errorText: { flex: 1, color: '#8E1B16', fontSize: 13, fontWeight: '600', lineHeight: 19 },
    fieldGroup: { marginBottom: 17 },
    label: { color: '#403A36', fontSize: 14, fontWeight: '700', marginBottom: 8 },
    input: { height: 52, borderWidth: 1, borderColor: '#DCCFC6', borderRadius: 7, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: '#202020', fontSize: 16 },
    passwordField: { height: 52, borderWidth: 1, borderColor: '#DCCFC6', borderRadius: 7, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
    passwordInput: { flex: 1, color: '#202020', fontSize: 16, height: '100%' },
    passwordToggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    submitButton: { minHeight: 52, borderRadius: 7, backgroundColor: '#FF8C42', alignItems: 'center', justifyContent: 'center', marginTop: 3 },
    submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E9DED7' },
    dividerText: { color: '#857A73', fontSize: 12, fontWeight: '600', marginHorizontal: 12 },
    googleButton: { minHeight: 52, borderRadius: 7, borderWidth: 1, borderColor: '#DCCFC6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF' },
    googleButtonText: { color: '#303030', fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.6 },
});
