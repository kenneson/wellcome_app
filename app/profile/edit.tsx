import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const occupations = [
    'Estudante',
    'Professor(a)',
    'Engenheiro(a)',
    'Médico(a)',
    'Designer',
    'Desenvolvedor(a)',
    'Outro',
];

const lookingForOptions = [
    { label: 'Comer', value: 'comer' },
    { label: 'Cozinhar', value: 'cozinhar' },
    { label: 'Ambos', value: 'ambos' },
];

export default function EditProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [occupation, setOccupation] = useState('');
    const [lookingFor, setLookingFor] = useState('');
    const [bio, setBio] = useState('');
    const [dietaryRestriction, setDietaryRestriction] = useState('');
    const [fullName, setFullName] = useState('');

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/auth/login');
                return;
            }

            setUserId(session.user.id);
            setFullName(session.user.user_metadata.full_name || '');

            const { data, error, status } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error && status !== 406) {
                throw error;
            }

            if (data) {
                setOccupation(data.occupation || '');
                setLookingFor(data.looking_for || '');
                setBio(data.bio || '');
                setAvatarUrl(data.avatar_url || null);
                if (data.dietary_restrictions && data.dietary_restrictions.length > 0) {
                    setDietaryRestriction(data.dietary_restrictions[0]);
                }
            }
        } catch (error: any) {
            Alert.alert('Erro ao carregar perfil', error.message);
        } finally {
            setLoading(false);
        }
    }

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            uploadAvatar(result.assets[0]);
        }
    };

    const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
        if (!userId) return;
        try {
            setSaving(true);
            const arrayBuffer = await fetch(asset.uri).then(res => res.arrayBuffer());
            const fileExt = asset.uri.split('.').pop();
            const fileName = `${userId}${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, arrayBuffer, {
                    contentType: asset.mimeType,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setAvatarUrl(publicUrl);
        } catch (error: any) {
            Alert.alert('Erro no upload', error.message);
        } finally {
            setSaving(false);
        }
    }

    const saveProfile = async () => {
        if (!userId) return;
        if (!occupation || !lookingFor) {
            Alert.alert('Atenção', 'Por favor preencha os campos obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            const updates = {
                id: userId,
                full_name: fullName,
                occupation,
                looking_for: lookingFor,
                bio,
                dietary_restrictions: dietaryRestriction ? [dietaryRestriction] : [],
                avatar_url: avatarUrl,
                updated_at: new Date(),
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updates);

            if (error) throw error;

            Alert.alert('Sucesso', 'Perfil atualizado!');
            router.back(); // Voltar para o dashboard
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>{'< Voltar'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Editar Perfil</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarButton}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="camera-outline" size={32} color="#999" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.avatarHint}>Toque para alterar a foto</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Com o que você trabalha? (Obrigatório)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Contador(a), Professor(a)"
                            value={occupation}
                            onChangeText={setOccupation}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>O que você procura na Wellcome? (Obrigatório)</Text>
                        <View style={styles.optionsRow}>
                            {lookingForOptions.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.optionButton,
                                        lookingFor === opt.value && styles.optionButtonSelected
                                    ]}
                                    onPress={() => setLookingFor(opt.value)}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        lookingFor === opt.value && styles.optionTextSelected
                                    ]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tem alguma restrição alimentar?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Selecione ou digite"
                            value={dietaryRestriction}
                            onChangeText={setDietaryRestriction}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Conte um pouco sobre você</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Dica: Fale sobre seus hobbies, coisas que você gosta..."
                            multiline
                            numberOfLines={4}
                            value={bio}
                            onChangeText={setBio}
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={saveProfile}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButtonText: {
        fontSize: 16,
        color: '#333',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        padding: 24,
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: 8,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarHint: {
        fontSize: 12,
        color: '#999',
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        color: '#999',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        minHeight: 100,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    optionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
    },
    optionButtonSelected: {
        backgroundColor: '#FF8C42',
        borderColor: '#FF8C42',
    },
    optionText: {
        color: '#666',
    },
    optionTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
