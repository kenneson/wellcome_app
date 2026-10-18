import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon as Ionicons } from '@/components/ui/icon';

interface LocationMapProps {
    latitude: number;
    longitude: number;
    confirmed: boolean;
    onConfirm: (coordinates: { latitude: number; longitude: number }) => void;
}

// Android has no embedded map (it would need a paid Google Maps billing account),
// so the host checks the pin in the device's maps app and confirms it here.
export function LocationMap({ latitude, longitude, confirmed, onConfirm }: LocationMapProps) {
    const openInMaps = () => Linking.openURL(`geo:${latitude},${longitude}?q=${latitude},${longitude}`);

    return (
        <View className="border border-gray-200 bg-gray-50 p-4" style={{ borderRadius: 8 }}>
            <TouchableOpacity
                className="flex-row items-center mb-3"
                onPress={openInMaps}
                accessibilityRole="button"
                accessibilityLabel="Conferir o local no aplicativo de mapas"
            >
                <Ionicons name="location-outline" size={20} color="#FF8C42" />
                <Text className="text-sm text-gray-700 ml-2 flex-1">{latitude.toFixed(5)}, {longitude.toFixed(5)}</Text>
                <Text className="text-sm font-bold" style={{ color: '#C94E16' }}>Ver no mapa</Text>
            </TouchableOpacity>
            <TouchableOpacity
                className={`${confirmed ? 'bg-emerald-600' : 'bg-[#1A1A1A]'} items-center py-3`}
                style={{ borderRadius: 8 }}
                onPress={() => onConfirm({ latitude, longitude })}
                accessibilityRole="button"
                accessibilityLabel="Confirmar local do evento"
            >
                <Text className="text-white font-bold">{confirmed ? 'Local confirmado' : 'Confirmar local'}</Text>
            </TouchableOpacity>
        </View>
    );
}
