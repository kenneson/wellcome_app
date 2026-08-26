import { AppIcon as Ionicons } from '@/components/ui/icon';
import { WellcomeButton } from '@/components/ui/wellcome';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import React from 'react';
import { Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EventPublishedModalProps {
    visible: boolean;
    eventTitle?: string;
    onGoToFeed: () => void;
    onViewEvent: () => void;
}

export function EventPublishedModal({
    visible,
    eventTitle,
    onGoToFeed,
    onViewEvent,
}: EventPublishedModalProps) {
    const reducedMotion = useReducedMotion();

    return (
        <Modal
            visible={visible}
            transparent
            animationType={reducedMotion ? 'none' : 'fade'}
            statusBarTranslucent
            onRequestClose={onGoToFeed}
        >
            <SafeAreaView
                className="flex-1 justify-center bg-black/55 px-5"
                edges={['top', 'bottom']}
            >
                <View
                    className="w-full max-w-[420px] self-center rounded-3xl bg-white px-6 pb-6 pt-7"
                    accessibilityViewIsModal
                >
                    <View className="mb-5 h-20 w-20 self-center items-center justify-center rounded-full bg-orange-50">
                        <Ionicons name="checkmark-circle" size={54} color="#E56F2D" />
                    </View>

                    <Text
                        className="text-center text-2xl font-extrabold text-[#1A1A1A]"
                        accessibilityRole="header"
                    >
                        Parabéns! Seu evento está no ar
                    </Text>
                    <Text className="mt-3 text-center text-base leading-6 text-gray-600">
                        {eventTitle
                            ? `“${eventTitle}” foi publicado com sucesso.`
                            : 'Seu evento foi publicado com sucesso.'}
                    </Text>

                    <View className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <View className="flex-row items-start">
                            <Ionicons name="compass-outline" size={21} color="#BE521F" />
                            <Text className="ml-3 flex-1 text-sm leading-5 text-[#7A3D1C]">
                                Ele já está disponível no feed para participantes da cidade escolhida.
                                Para gerenciar inscrições, acesse Perfil → Meus Eventos Criados.
                            </Text>
                        </View>
                    </View>

                    <View className="mt-6 gap-3">
                        <WellcomeButton
                            label="Ver meu evento"
                            variant="outline"
                            icon="eye-outline"
                            onPress={onViewEvent}
                        />
                        <WellcomeButton
                            label="Voltar para o feed"
                            icon="home-outline"
                            onPress={onGoToFeed}
                        />
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}
