import { reviewService } from '@/services/api/ReviewService';
import { supabase } from '@/shared/lib/supabase';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';

export default function ReviewEventScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit() {
        if (rating === 0) {
            Alert.alert('Avaliação necessária', 'Por favor, selecione uma nota de 1 a 5 estrelas.');
            return;
        }

        try {
            setSubmitting(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                Alert.alert('Erro', 'Você precisa estar logado para avaliar.');
                return;
            }

            await reviewService.create({
                eventId: id as string,
                userId: session.user.id,
                rating,
                comment
            });

            Alert.alert('Sucesso', 'Sua avaliação foi enviada!');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível enviar sua avaliação.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <View style={styles.screen}>
            <BrandStackHeader eyebrow="AVALIAÇÃO" title="Avaliar evento" backIcon="close" />
            <BrandSheet>
                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    extraScrollHeight={40}
                    extraHeight={120}
                    enableResetScrollToCoords={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    style={{ flex: 1 }}
                >
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Como foi sua experiência?</Text>
                        <View style={styles.stars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRating(star)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                                    accessibilityState={{ selected: star <= rating }}
                                    hitSlop={4}
                                >
                                    <Ionicons
                                        name={star <= rating ? 'star' : 'star-outline'}
                                        size={40}
                                        color={star <= rating ? Palette.star : Palette.subtle}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>COMENTÁRIO (OPCIONAL)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Conte mais sobre o evento..."
                            placeholderTextColor={Palette.subtle}
                            multiline
                            textAlignVertical="top"
                            value={comment}
                            onChangeText={setComment}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, submitting && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: submitting }}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Enviar avaliação</Text>
                        )}
                    </TouchableOpacity>
                </KeyboardAwareScrollView>
            </BrandSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.paper },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl * 2, gap: Spacing.lg, flexGrow: 1 },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.lg,
    },
    cardTitle: { fontSize: 18, fontWeight: '800', color: Palette.ink, textAlign: 'center' },
    stars: { flexDirection: 'row', gap: Spacing.sm },
    field: { gap: Spacing.sm },
    label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: Palette.muted },
    input: {
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        minHeight: 128,
        padding: Spacing.lg,
        fontSize: 15,
        color: Palette.ink,
    },
    button: {
        minHeight: 48,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orange,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
