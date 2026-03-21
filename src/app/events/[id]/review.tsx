import { reviewService } from '@/services/api/ReviewService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <SafeAreaView className="flex-1 bg-white">
            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ padding: 24, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
            <View className="flex-row items-center mb-6">
                <TouchableOpacity onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-[#1A1A1A]">Avaliar Evento</Text>
            </View>

            <View className="mb-8 items-center">
                <Text className="text-lg text-gray-600 mb-4">Como foi sua experiência?</Text>
                <View className="flex-row space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Ionicons
                                name={star <= rating ? "star" : "star-outline"}
                                size={40}
                                color="#FF8C42"
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View className="mb-6">
                <Text className="text-base font-bold text-[#1A1A1A] mb-2">Comentário (opcional)</Text>
                <TextInput
                    className="bg-gray-50 p-4 rounded-xl text-base text-[#1A1A1A] h-32"
                    placeholder="Conte mais sobre o evento..."
                    multiline
                    textAlignVertical="top"
                    value={comment}
                    onChangeText={setComment}
                />
            </View>

            <TouchableOpacity
                className={`w-full py-4 rounded-xl items-center ${submitting ? 'bg-gray-300' : 'bg-[#FF8C42]'}`}
                onPress={handleSubmit}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-bold text-base">Enviar Avaliação</Text>
                )}
            </TouchableOpacity>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
