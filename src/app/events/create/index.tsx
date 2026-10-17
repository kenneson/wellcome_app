import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { BrandSheet, BrandStackHeader, WellcomeBottomBar, WellcomeButton } from '@/components/ui/wellcome';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SelectionPill } from '@/components/ui/SelectionPill';
import { SelectionSection } from '@/components/ui/SelectionSection';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { useEventDetailsViewModel } from '@/features/events/create/useEventDetailsViewModel';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EVENT_TYPES = ['Café da manhã', 'Brunch', 'Almoço', 'Lanche', 'Jantar', 'Degustação', 'Pic-nic', 'Coquetel', 'Outro'] as const;
const CUISINE_TYPES = [
    'Africana', 'Alemã', 'Asiática', 'Árabe', 'Argentina', 'Baiana', 'Brasileira', 'Carnes',
    'Café colonial', 'Chinesa', 'Colombiana', 'Contemporânea', 'Coreana', 'Crepes',
    'Doces e bolos', 'Espanhola', 'Francesa', 'Frutos do mar', 'Gaúcha', 'Grega',
    'Hambúrguer', 'Indiana', 'Italiana', 'Japonesa', 'Lanches', 'Mexicana', 'Mineira',
    'Mediterrânea', 'Nordestina', 'Pastéis', 'Peruana', 'Pizza', 'Portuguesa',
    'Sopas e caldos', 'Tailandesa', 'Variada', 'Vegana', 'Vegetariana',
] as const;

export default function EventCreateEssentials() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const creation = useEventCreation();
    const reducedMotion = useReducedMotion();
    const { setCurrentStep } = creation;
    const details = useEventDetailsViewModel();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showCuisines, setShowCuisines] = useState(false);
    const [cuisineSearch, setCuisineSearch] = useState('');
    const titleRef = useRef<TextInput>(null);
    const descriptionRef = useRef<TextInput>(null);

    useEffect(() => setCurrentStep(0), [setCurrentStep]);

    const filteredCuisines = useMemo(() => {
        const search = cuisineSearch.trim().toLocaleLowerCase('pt-BR');
        return search ? CUISINE_TYPES.filter((item) => item.toLocaleLowerCase('pt-BR').includes(search)) : CUISINE_TYPES;
    }, [cuisineSearch]);

    const handleNext = async () => {
        const nextErrors = validateEventStep(creation.data, 0);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            requestAnimationFrame(() => {
                if (nextErrors.title) titleRef.current?.focus();
                else if (nextErrors.description) descriptionRef.current?.focus();
            });
            return;
        }
        await creation.flushDraft();
        router.push('/events/create/menu');
    };

    const handleExit = () => Alert.alert('Sair da criação?', 'Seu rascunho está salvo e poderá ser retomado em Meus eventos.', [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Sair', onPress: () => router.replace('/(tabs)') },
        {
            text: 'Excluir rascunho',
            style: 'destructive',
            onPress: () => void creation.discardDraft().then(() => router.replace('/(tabs)')),
        },
    ]);

    return (
        <View style={styles.screen}>
            <CreateEventHeader onBack={handleExit} onDiscard={handleExit} saveStatus={creation.saveStatus} />
            <BrandSheet>
                <KeyboardAwareScrollView
                    contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
                    keyboardShouldPersistTaps="handled"
                    style={styles.flex}
                >
                    <WizardProgress currentStep={0} />
                    <Text style={styles.title}>Comece pela experiência</Text>
                    <Text style={styles.subtitle}>Uma boa apresentação ajuda as pessoas a entenderem o que torna seu evento especial.</Text>

                    <TouchableOpacity
                        onPress={details.pickImage}
                        style={[styles.cover, { height: width < 375 ? 165 : 200 }, errors.coverImageUrl && styles.coverError]}
                        accessibilityRole="button"
                        accessibilityLabel={creation.data.details.coverImage ? 'Alterar foto de capa' : 'Adicionar foto de capa'}
                    >
                        {creation.data.details.coverImage ? (
                            <>
                                <Image source={{ uri: creation.data.details.coverImage }} style={styles.coverImage} contentFit="cover" />
                                <View style={styles.coverBadge}>
                                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                                    <Text style={styles.coverBadgeText}>Alterar</Text>
                                </View>
                            </>
                        ) : (
                            <View style={styles.coverEmpty}>
                                <View style={styles.coverIcon}>
                                    <Ionicons name="camera-outline" size={26} color={Palette.orangeDeep} />
                                </View>
                                <Text style={styles.coverTitle}>Adicionar foto de capa</Text>
                                <Text style={styles.coverHint}>Imagem horizontal em 16:9</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {errors.coverImageUrl && <Text style={[styles.errorText, styles.coverErrorText]}>{errors.coverImageUrl}</Text>}

                    <Field label="Título do evento" error={errors.title} count={`${creation.data.details.title.length}/80`}>
                        <TextInput
                            ref={titleRef}
                            style={styles.input}
                            placeholder="Ex: Jantar árabe na casa da Ju"
                            placeholderTextColor={Palette.subtle}
                            value={creation.data.details.title}
                            maxLength={80}
                            onChangeText={(title) => creation.updateDetails({ title })}
                        />
                    </Field>

                    <Field label="Descrição" error={errors.description} count={`${creation.data.details.description.length}/1500`}>
                        <TextInput
                            ref={descriptionRef}
                            style={[styles.input, styles.textArea]}
                            placeholder="Conte o menu, a proposta da noite e o que os convidados podem esperar."
                            placeholderTextColor={Palette.subtle}
                            value={creation.data.details.description}
                            maxLength={1500}
                            onChangeText={(description) => creation.updateDetails({ description })}
                            multiline
                            textAlignVertical="top"
                        />
                    </Field>

                    <View style={styles.eventTypeSection}>
                        <SelectionSection title="Tipo de evento" items={EVENT_TYPES} selectedItems={creation.data.eventType} onSelect={creation.setEventType} variant="grid" />
                        {errors.eventType && <Text style={[styles.errorText, styles.eventTypeError]}>{errors.eventType}</Text>}
                    </View>

                    <Text style={styles.sectionTitle}>Culinárias</Text>
                    <Text style={styles.sectionSubtitle}>Escolha até cinco opções.</Text>
                    <View style={styles.pills}>
                        {creation.data.cuisineTypes.map((item) => <SelectionPill key={item} label={item} selected onPress={() => creation.toggleCuisineType(item)} />)}
                    </View>
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => setShowCuisines(true)}
                        accessibilityRole="button"
                    >
                        <Ionicons name="search" size={18} color={Palette.orangeDeep} />
                        <Text style={styles.searchButtonText}>Buscar culinárias</Text>
                    </TouchableOpacity>
                    {errors.cuisineTypes && <Text style={styles.errorText}>{errors.cuisineTypes}</Text>}
                </KeyboardAwareScrollView>
            </BrandSheet>

            <WellcomeBottomBar>
                <WellcomeButton label="Continuar" onPress={() => void handleNext()} />
            </WellcomeBottomBar>
            <Modal visible={showCuisines} animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={() => setShowCuisines(false)}>
                <View style={styles.screen}>
                    <BrandStackHeader
                        eyebrow="CULINÁRIAS"
                        title="Escolha as culinárias"
                        backIcon="close"
                        onBack={() => setShowCuisines(false)}
                        actions={(
                            <View style={styles.counterPill}>
                                <Text style={styles.counterText}>{creation.data.cuisineTypes.length}/5</Text>
                            </View>
                        )}
                    />
                    <BrandSheet>
                        <View style={styles.searchField}>
                            <Ionicons name="search" size={20} color={Palette.muted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar"
                                placeholderTextColor={Palette.subtle}
                                value={cuisineSearch}
                                onChangeText={setCuisineSearch}
                                autoFocus
                            />
                        </View>
                        <KeyboardAwareScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                            <View style={styles.pills}>
                                {filteredCuisines.map((item) => <SelectionPill key={item} label={item} selected={creation.data.cuisineTypes.includes(item)} onPress={() => creation.toggleCuisineType(item)} />)}
                            </View>
                        </KeyboardAwareScrollView>
                        <SafeAreaView edges={['bottom']} style={styles.modalFooter}>
                            <TouchableOpacity style={styles.doneButton} onPress={() => setShowCuisines(false)} accessibilityRole="button">
                                <Text style={styles.doneButtonText}>Concluir</Text>
                            </TouchableOpacity>
                        </SafeAreaView>
                    </BrandSheet>
                </View>
            </Modal>
        </View>
    );
}

function Field({ label, error, count, children }: { label: string; error?: string; count: string; children: React.ReactNode }) {
    return (
        <View style={styles.field}>
            <View style={styles.fieldHeader}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <Text style={styles.fieldCount}>{count}</Text>
            </View>
            <View style={[styles.fieldControl, error ? styles.fieldControlError : null]}>{children}</View>
            {error && <Text style={[styles.errorText, styles.fieldError]} accessibilityRole="alert">{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    flex: {
        flex: 1,
    },
    content: {
        paddingTop: Spacing.xl,
        paddingBottom: 120,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Palette.ink,
        marginTop: Spacing.xl,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginTop: Spacing.xs,
        marginBottom: Spacing.xl,
    },
    cover: {
        width: '100%',
        overflow: 'hidden',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
        marginBottom: Spacing.sm,
    },
    coverError: {
        borderColor: Palette.danger,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    coverBadge: {
        position: 'absolute',
        bottom: Spacing.md,
        right: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.scrim,
    },
    coverBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    coverEmpty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
        gap: 4,
    },
    coverIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    coverTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.ink,
    },
    coverHint: {
        fontSize: 12,
        color: Palette.muted,
    },
    coverErrorText: {
        marginBottom: Spacing.lg,
    },
    errorText: {
        fontSize: 12,
        color: Palette.danger,
    },
    input: {
        minHeight: 48,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        fontSize: 15,
        color: Palette.ink,
    },
    textArea: {
        minHeight: 125,
    },
    eventTypeSection: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.xxl,
    },
    eventTypeError: {
        marginTop: Spacing.xs,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
    },
    sectionSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginTop: Spacing.xs,
        marginBottom: Spacing.md,
    },
    pills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    searchButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
        marginBottom: Spacing.sm,
    },
    searchButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.orangeDeep,
    },
    field: {
        marginBottom: Spacing.lg,
    },
    fieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Palette.inkSoft,
    },
    fieldCount: {
        fontSize: 12,
        color: Palette.muted,
    },
    fieldControl: {
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    fieldControlError: {
        borderColor: Palette.danger,
    },
    fieldError: {
        marginTop: Spacing.xs,
    },
    counterPill: {
        minWidth: 44,
        minHeight: 44,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.onBrandGlass,
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    searchField: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    searchInput: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
    },
    modalContent: {
        padding: Spacing.xl,
    },
    modalFooter: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.lg,
        backgroundColor: Palette.surface,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
    },
    doneButton: {
        minHeight: 48,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orange,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
