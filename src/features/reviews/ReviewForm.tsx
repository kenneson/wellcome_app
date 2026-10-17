import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';

interface ReviewFormProps {
    onSubmit: (rating: number, comment: string) => Promise<void>;
    loading?: boolean;
}

export function ReviewForm({ onSubmit, loading }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const handleSubmit = async () => {
        if (rating > 0) {
            await onSubmit(rating, comment);
            setRating(0);
            setComment('');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Avalie sua experiência</Text>
            <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                        key={star}
                        onPress={() => setRating(star)}
                        accessibilityRole="button"
                        accessibilityLabel={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
                        accessibilityState={{ selected: star <= rating }}
                    >
                        <Ionicons
                            name={star <= rating ? 'star' : 'star-outline'}
                            size={32}
                            color={star <= rating ? Palette.star : Palette.subtle}
                            style={styles.star}
                        />
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput
                style={styles.input}
                placeholder="Escreva um comentário (opcional)"
                placeholderTextColor={Palette.subtle}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
            />
            <TouchableOpacity
                style={[styles.button, (rating === 0 || loading) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={rating === 0 || loading}
                accessibilityRole="button"
                accessibilityState={{ disabled: rating === 0 || !!loading }}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>Enviar avaliação</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.xl,
        marginVertical: Spacing.lg,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    star: {
        marginHorizontal: 4,
    },
    input: {
        backgroundColor: Palette.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
        textAlignVertical: 'top',
        minHeight: 80,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Palette.line,
    },
    button: {
        backgroundColor: Palette.orange,
        borderRadius: BorderRadius.full,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
