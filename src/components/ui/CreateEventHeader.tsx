import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EventCreationSaveStatus } from '@/entities/event/model/types';

interface CreateEventHeaderProps {
    title?: string;
    onBack?: () => void;
    saveStatus?: EventCreationSaveStatus;
    onDiscard?: () => void;
}

const SAVE_LABELS: Partial<Record<EventCreationSaveStatus, string>> = {
    saving: 'Salvando...',
    saved: 'Salvo',
    offline: 'Sem conexão',
    error: 'Sem conexão',
};

export function CreateEventHeader({ title = 'Crie seu evento', onBack, saveStatus, onDiscard }: CreateEventHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <View className="min-h-[60px] flex-row items-center justify-between px-4 bg-white border-b border-gray-100">
            <TouchableOpacity
                onPress={handleBack}
                className="w-11 h-11 -ml-2 items-center justify-center"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Voltar"
            >
                <IconSymbol name="chevron.left" size={24} color="#1A1A1A" />
            </TouchableOpacity>

            <View className="flex-1 items-center px-2">
                <Text className="text-[17px] font-bold text-[#1A1A1A] text-center" numberOfLines={1}>{title}</Text>
                {saveStatus && SAVE_LABELS[saveStatus] ? (
                    <Text className={`text-[11px] mt-0.5 ${saveStatus === 'error' || saveStatus === 'offline' ? 'text-amber-600' : 'text-gray-400'}`}>
                        {SAVE_LABELS[saveStatus]}
                    </Text>
                ) : null}
            </View>

            {onDiscard ? (
                <TouchableOpacity
                    onPress={onDiscard}
                    className="w-11 h-11 items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Excluir rascunho"
                >
                    <IconSymbol name="trash" size={20} color="#B33A34" />
                </TouchableOpacity>
            ) : <View className="w-11" />}
        </View>
    );
}
