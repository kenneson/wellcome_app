import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { AppIcon } from '@/components/ui/icon';
import { WellcomeButton, WellcomeField, WellcomeIconButton } from '@/components/ui/wellcome';
import { useUserProfile } from '@/context/UserProfileContext';
import { supabase } from '@/shared/lib/supabase';
import { Box } from '@/shared/ui/box';
import { Text } from '@/shared/ui/text';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const lookingForOptions = [
    { label: 'Participar', value: 'comer', icon: 'restaurant-outline' },
    { label: 'Criar eventos', value: 'cozinhar', icon: 'calendar-outline' },
    { label: 'Os dois', value: 'ambos', icon: 'people-outline' },
];

export default function EditProfileScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { mandatory } = useLocalSearchParams<{ mandatory?: string }>();
    const { refetchProfile } = useUserProfile();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [occupation, setOccupation] = useState('');
    const [lookingFor, setLookingFor] = useState('');
    const [bio, setBio] = useState('');
    const [dietaryRestriction, setDietaryRestriction] = useState('');
    const [fullName, setFullName] = useState('');
    const [city, setCity] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [languages, setLanguages] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    useEffect(() => {
        void getProfile();
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

            if (error && status !== 406) throw error;
            if (data) {
                setFullName(data.full_name || session.user.user_metadata.full_name || '');
                setOccupation(data.occupation || '');
                setLookingFor(data.looking_for || '');
                setBio(data.bio || '');
                setAvatarUrl(data.avatar_url || null);
                setCity(data.city || '');
                setNeighborhood(data.neighborhood || '');
                setLanguages(Array.isArray(data.languages) ? data.languages.join(', ') : '');
                setPhoneNumber(data.phone_number || '');
                setDietaryRestriction(Array.isArray(data.dietary_restrictions) ? data.dietary_restrictions.join(', ') : '');
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
        });
        if (!result.canceled && result.assets.length > 0) await uploadAvatar(result.assets[0]);
    };

    const uploadAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
        if (!userId) return;
        try {
            setSaving(true);
            const arrayBuffer = await fetch(asset.uri).then((response) => response.arrayBuffer());
            const fileExt = asset.uri.split('.').pop() || 'jpg';
            const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, arrayBuffer, {
                contentType: asset.mimeType || 'image/jpeg',
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
    };

    const saveProfile = async () => {
        if (!userId || saving) return;
        if (!fullName.trim() || !occupation.trim() || !lookingFor || !city.trim() || !neighborhood.trim()) {
            Alert.alert('Revise os dados', 'Preencha nome, ocupação, objetivo, cidade e bairro para continuar.');
            return;
        }

        try {
            setSaving(true);
            const { error } = await supabase.from('profiles').upsert({
                id: userId,
                full_name: fullName.trim(),
                occupation: occupation.trim(),
                looking_for: lookingFor,
                bio: bio.trim(),
                city: city.trim(),
                neighborhood: neighborhood.trim(),
                languages: splitList(languages),
                phone_number: phoneNumber.trim(),
                dietary_restrictions: splitList(dietaryRestriction),
                avatar_url: avatarUrl,
                updated_at: new Date(),
            });
            if (error) throw error;

            await refetchProfile();
            Alert.alert('Perfil atualizado', 'Suas informações foram salvas com sucesso.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/profile') },
            ]);
        } catch (error: any) {
            Alert.alert('Erro ao salvar', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#FFF8F3]">
                <ActivityIndicator size="large" color="#FF8C42" />
                <Text className="mt-3 text-sm text-typography-500">Carregando seu perfil...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#FFF8F3]" edges={['top', 'bottom']}>
            <Box className="min-h-[64px] flex-row items-center border-b border-outline-100 bg-white px-2">
                {mandatory === 'true' ? (
                    <Box className="h-12 w-12" />
                ) : (
                    <WellcomeIconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Voltar" />
                )}
                <Box className="flex-1 items-center px-2">
                    <Text className="text-[17px] font-bold text-typography-900">Editar perfil</Text>
                    <Text className="mt-0.5 text-[11px] text-typography-400">Mantenha seus dados atualizados</Text>
                </Box>
                <Box className="h-12 w-12" />
            </Box>

            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: 20, paddingBottom: 36 }}
                extraHeight={80}
                extraScrollHeight={24}
                keyboardShouldPersistTaps="handled"
            >
                <Box className="mb-5 items-center rounded-3xl border border-outline-100 bg-white px-5 py-6">
                    <TouchableOpacity
                        onPress={() => void pickImage()}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Alterar foto de perfil"
                        className="relative"
                    >
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={{ width: 104, height: 104, borderRadius: 52 }} contentFit="cover" />
                        ) : (
                            <View className="h-[104px] w-[104px] items-center justify-center rounded-full bg-primary-50">
                                <AppIcon name="person-outline" size={42} color="#C45D22" />
                            </View>
                        )}
                        <View className="absolute -bottom-1 -right-1 h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-primary-500">
                            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <AppIcon name="camera-outline" size={20} color="#FFFFFF" />}
                        </View>
                    </TouchableOpacity>
                    <Text className="mt-4 text-base font-bold text-typography-900">Sua apresentação</Text>
                    <Text className="mt-1 text-center text-sm leading-5 text-typography-500">
                        Uma foto nítida e informações completas ajudam a criar confiança na comunidade.
                    </Text>
                </Box>

                <ProfileSection icon="person-outline" title="Informações principais">
                    <ProfileInput label="Nome completo" hint="Obrigatório" placeholder="Como você quer ser chamado" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" textContentType="name" />
                    <ProfileInput label="Ocupação" hint="Obrigatório" placeholder="Ex.: Contador(a), Professor(a)" value={occupation} onChangeText={setOccupation} autoCapitalize="sentences" />

                    <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-typography-600">O que você procura na Wellcome?</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {lookingForOptions.map((option) => {
                            const selected = lookingFor === option.value;
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => setLookingFor(option.value)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected }}
                                    className={`min-h-11 flex-row items-center rounded-full border px-4 ${selected ? 'border-primary-500 bg-primary-50' : 'border-outline-200 bg-white'}`}
                                >
                                    <AppIcon name={option.icon} size={18} color={selected ? '#C45D22' : '#6B7280'} />
                                    <Text className={`ml-2 text-sm font-semibold ${selected ? 'text-primary-700' : 'text-typography-600'}`}>{option.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ProfileSection>

                <ProfileSection icon="location-outline" title="Localização">
                    <View className="flex-row gap-3">
                        <Box className="flex-1">
                            <ProfileInput label="Cidade" hint="Obrigatório" placeholder="Sua cidade" value={city} onChangeText={setCity} autoCapitalize="words" />
                        </Box>
                        <Box className="flex-1">
                            <ProfileInput label="Bairro" hint="Obrigatório" placeholder="Seu bairro" value={neighborhood} onChangeText={setNeighborhood} autoCapitalize="words" />
                        </Box>
                    </View>
                </ProfileSection>

                <ProfileSection icon="message" title="Sobre você">
                    <ProfileInput label="Idiomas" hint="Separe por vírgulas" placeholder="Português, inglês, espanhol..." value={languages} onChangeText={setLanguages} autoCapitalize="sentences" />
                    <ProfileInput label="WhatsApp / telefone" placeholder="(11) 99999-9999" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
                    <ProfileInput label="Restrições alimentares" hint="Separe por vírgulas" placeholder="Ex.: lactose, amendoim" value={dietaryRestriction} onChangeText={setDietaryRestriction} autoCapitalize="sentences" />
                    <ProfileInput label="Biografia" hint={`${bio.length}/500`} placeholder="Conte sobre seus interesses, experiências e o que torna um encontro especial para você." value={bio} onChangeText={setBio} multiline maxLength={500} />
                </ProfileSection>

                <WellcomeButton label="Salvar alterações" icon="checkmark" loading={saving} disabled={saving} onPress={() => void saveProfile()} />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

function ProfileSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <Box className="mb-5 rounded-3xl border border-outline-100 bg-white p-4">
            <Box className="mb-4 flex-row items-center">
                <Box className="h-10 w-10 items-center justify-center rounded-full bg-primary-50">
                    <AppIcon name={icon} size={20} color="#C45D22" />
                </Box>
                <Text className="ml-3 text-base font-bold text-typography-900">{title}</Text>
            </Box>
            {children}
        </Box>
    );
}

type ProfileInputProps = React.ComponentProps<typeof TextInput> & { label: string; hint?: string };

function ProfileInput({ label, hint, multiline, style, ...props }: ProfileInputProps) {
    return (
        <WellcomeField label={label} hint={hint}>
            <TextInput
                {...props}
                multiline={multiline}
                placeholderTextColor="#9CA3AF"
                textAlignVertical={multiline ? 'top' : 'center'}
                className={`px-4 text-base text-[#1A1A1A] ${multiline ? 'min-h-[112px] py-3' : 'min-h-12 py-3'}`}
                style={style}
            />
        </WellcomeField>
    );
}

function splitList(value: string) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}
