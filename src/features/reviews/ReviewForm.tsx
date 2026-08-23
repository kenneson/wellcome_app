import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AppIcon as Ionicons } from '@/components/ui/icon';

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
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons
                            name={star <= rating ? 'star' : 'star-outline'}
                            size={32}
                            color={star <= rating ? '#FFD700' : '#CCCCCC'}
                            style={styles.star}
                        />
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput
                style={styles.input}
                placeholder="Escreva um comentário (opcional)"
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
            />
            <TouchableOpacity
                style={[styles.button, (rating === 0 || loading) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={rating === 0 || loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.buttonText}>Enviar Avaliação</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    star: {
        marginHorizontal: 4,
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#333',
        textAlignVertical: 'top',
        minHeight: 80,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    button: {
        backgroundColor: '#FF5A5F',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#FFB0B3',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
