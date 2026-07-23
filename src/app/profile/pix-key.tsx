import { userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PIX_KEY_TYPES = [
    { label: 'CPF', value: 'CPF' },
    { label: 'E-mail', value: 'EMAIL' },
    { label: 'Telefone', value: 'PHONE' },
    { label: 'Chave Aleatória', value: 'EVP' },
];

export default function PixKeyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [pixKey, setPixKey] = useState('');
    const [pixKeyType, setPixKeyType] = useState('CPF');

    useEffect(() => {
        loadCurrentKey();
    }, []);

    async function loadCurrentKey() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.replace('/auth/login'); return; }
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

    async function savePixKey() {
        if (!userId) return;
        if (!pixKey.trim()) {
            Alert.alert('Atenção', 'Por favor, informe a chave PIX.');
            return;
        }
        setSaving(true);
        try {
            await userService.updateProfile(userId, {
                pix_key: pixKey.trim(),
                pix_key_type: pixKeyType,
            });
            Alert.alert('Sucesso!', 'Chave PIX salva com sucesso.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível salvar a chave PIX.');
        } finally {
            setSaving(false);
        }
    }

    const getPlaceholder = () => {
        switch (pixKeyType) {
            case 'CPF': return '000.000.000-00';
            case 'EMAIL': return 'seuemail@exemplo.com';
            case 'PHONE': return '+55 (11) 99999-9999';
            case 'EVP': return 'Chave aleatória (UUID)';
            default: return 'Sua chave PIX';
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Minha Chave PIX</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
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
                        >
                            <Text style={[styles.typeButtonText, pixKeyType === type.value && styles.typeButtonTextActive]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Key Input */}
                <Text style={[styles.label, { marginTop: 24 }]}>Chave PIX</Text>
                <TextInput
                    style={styles.input}
                    value={pixKey}
                    onChangeText={setPixKey}
                    placeholder={getPlaceholder()}
                    placeholderTextColor="#aaa"
                    autoCapitalize="none"
                    keyboardType={pixKeyType === 'PHONE' ? 'phone-pad' : 'default'}
                />

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={savePixKey}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Salvar Chave PIX</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    content: { padding: 24 },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 16,
        marginBottom: 28,
        gap: 10,
    },
    infoText: { flex: 1, fontSize: 14, color: '#1565C0', lineHeight: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 10 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1.5,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    typeButtonActive: { borderColor: '#FF8C42', backgroundColor: '#FFF3E0' },
    typeButtonText: { fontSize: 14, color: '#666', fontWeight: '500' },
    typeButtonTextActive: { color: '#FF8C42', fontWeight: '700' },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#ddd',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#333',
        marginBottom: 24,
    },
    saveButton: {
        backgroundColor: '#FF8C42',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
