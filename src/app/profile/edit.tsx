import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { AppIcon } from '@/components/ui/icon';
import { BrandHeader, BrandSheet, BrandStackHeader, WellcomeButton, WellcomeField } from '@/components/ui/wellcome';
import { useUserProfile } from '@/context/UserProfileContext';
import { userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

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

    async function getProfile() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/auth/login');
                return;
            }

            setUserId(session.user.id);
            const profile = await userService.getProfile(session.user.id);
            setFullName(profile.fullName || session.user.user_metadata.full_name || '');
            setOccupation(profile.occupation || '');
            setLookingFor(profile.lookingFor || '');
            setBio(profile.bio || '');
            setAvatarUrl(profile.avatarUrl || null);
            setCity(profile.city || '');
            setNeighborhood(profile.neighborhood || '');
            setLanguages(Array.isArray(profile.languages) ? profile.languages.join(', ') : '');
            setPhoneNumber(profile.phoneNumber || '');
            setDietaryRestriction(Array.isArray(profile.dietaryRestrictions) ? profile.dietaryRestrictions.join(', ') : '');
        } catch (error: any) {
            Alert.alert('Erro ao carregar perfil', friendlyErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load on mount
        void getProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
    }, []);

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
            Alert.alert('Erro no upload', friendlyErrorMessage(error));
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
            await userService.updateProfile(userId, {
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
            });

            await refetchProfile();
            Alert.alert('Perfil atualizado', 'Suas informações foram salvas com sucesso.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/profile') },
            ]);
        } catch (error: any) {
            console.error('[EditProfile] Falha ao atualizar perfil', error?.code || error?.message);
            Alert.alert(
                'Erro ao salvar',
                'Não foi possível salvar suas alterações. Verifique sua conexão e tente novamente.',
            );
        } finally {
            setSaving(false);
        }
    };

    const header = mandatory === 'true' ? (
        <BrandHeader eyebrow="CONTA" title="Editar perfil" />
    ) : (
        <BrandStackHeader eyebrow="CONTA" title="Editar perfil" backIcon="close" />
    );

    if (loading) {
        return (
            <View style={styles.screen}>
                {header}
                <BrandSheet>
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                        <Text style={styles.loadingText}>Carregando seu perfil...</Text>
                    </View>
                </BrandSheet>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            {header}
            <BrandSheet>
                <SafeAreaView style={styles.flex} edges={['bottom']}>
                    <KeyboardAwareScrollView
                        style={styles.flex}
                        contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingTop: Spacing.xl, paddingBottom: 36 }}
                        extraHeight={80}
                        extraScrollHeight={24}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={[styles.card, styles.introCard]}>
                            <TouchableOpacity
                                onPress={() => void pickImage()}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Alterar foto de perfil"
                                style={styles.avatarButton}
                            >
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
                                ) : (
                                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                                        <AppIcon name="person-outline" size={42} color={Palette.orangeDeep} />
                                    </View>
                                )}
                                <View style={styles.cameraBadge}>
                                    {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <AppIcon name="camera-outline" size={20} color="#FFFFFF" />}
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.introTitle}>Sua apresentação</Text>
                            <Text style={styles.introBody}>
                                Uma foto nítida e informações completas ajudam a criar confiança na comunidade.
                            </Text>
                        </View>

                        <ProfileSection icon="person-outline" title="Informações principais">
                            <ProfileInput label="Nome completo" hint="Obrigatório" placeholder="Como você quer ser chamado" value={fullName} onChangeText={setFullName} autoCapitalize="words" autoComplete="name" textContentType="name" />
                            <ProfileInput label="Ocupação" hint="Obrigatório" placeholder="Ex.: Contador(a), Professor(a)" value={occupation} onChangeText={setOccupation} autoCapitalize="sentences" />

                            <Text style={styles.groupLabel}>O que você procura na Wellcome?</Text>
                            <View style={styles.chipRow}>
                                {lookingForOptions.map((option) => {
                                    const selected = lookingFor === option.value;
                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() => setLookingFor(option.value)}
                                            accessibilityRole="radio"
                                            accessibilityState={{ checked: selected }}
                                            style={[styles.chip, selected && styles.chipSelected]}
                                        >
                                            <AppIcon name={option.icon} size={18} color={selected ? Palette.orangeDeep : Palette.inkSoft} />
                                            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ProfileSection>

                        <ProfileSection icon="location-outline" title="Localização">
                            <View style={styles.row}>
                                <View style={styles.flex}>
                                    <ProfileInput label="Cidade" hint="Obrigatório" placeholder="Sua cidade" value={city} onChangeText={setCity} autoCapitalize="words" />
                                </View>
                                <View style={styles.flex}>
                                    <ProfileInput label="Bairro" hint="Obrigatório" placeholder="Seu bairro" value={neighborhood} onChangeText={setNeighborhood} autoCapitalize="words" />
                                </View>
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
            </BrandSheet>
        </View>
    );
}

function ProfileSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
    return (
        <View style={styles.card}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                    <AppIcon name={icon} size={20} color={Palette.orangeDeep} />
                </View>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

type ProfileInputProps = React.ComponentProps<typeof TextInput> & { label: string; hint?: string };

function ProfileInput({ label, hint, multiline, style, ...props }: ProfileInputProps) {
    return (
        <WellcomeField label={label} hint={hint}>
            <TextInput
                {...props}
                multiline={multiline}
                placeholderTextColor={Palette.subtle}
                textAlignVertical={multiline ? 'top' : 'center'}
                style={[styles.input, multiline && styles.inputMultiline, style]}
            />
        </WellcomeField>
    );
}

function splitList(value: string) {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.paper },
    flex: { flex: 1 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    loadingText: { fontSize: 14, color: Palette.inkSoft },
    card: {
        marginBottom: Spacing.lg,
        padding: 14,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    introCard: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xl },
    avatarButton: { position: 'relative' },
    avatar: { width: 104, height: 104, borderRadius: 52 },
    avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.orangeSoft },
    cameraBadge: {
        position: 'absolute',
        right: -4,
        bottom: -4,
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        borderWidth: 3,
        borderColor: Palette.surface,
        backgroundColor: Palette.orange,
        alignItems: 'center',
        justifyContent: 'center',
    },
    introTitle: { marginTop: Spacing.lg, fontSize: 18, fontWeight: '800', color: Palette.ink },
    introBody: { marginTop: 4, fontSize: 14, lineHeight: 21, color: Palette.inkSoft, textAlign: 'center' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
    sectionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.orangeSoft, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { marginLeft: Spacing.md, fontSize: 18, fontWeight: '800', color: Palette.ink },
    groupLabel: { marginBottom: Spacing.sm, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: Palette.inkSoft },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    chipSelected: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
    chipText: { marginLeft: Spacing.sm, fontSize: 14, fontWeight: '700', color: Palette.inkSoft },
    chipTextSelected: { color: Palette.orangeDeep, fontWeight: '800' },
    row: { flexDirection: 'row', gap: Spacing.md },
    input: { minHeight: 48, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: 16, color: Palette.ink },
    inputMultiline: { minHeight: 112 },
});
