import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationMapProps {
    latitude: number;
    longitude: number;
    confirmed: boolean;
    onConfirm: (coordinates: { latitude: number; longitude: number }) => void;
}

export function LocationMap({ latitude, longitude, confirmed, onConfirm }: LocationMapProps) {
    return (
        <View className="border border-gray-200 bg-gray-50 p-4" style={{ borderRadius: 8 }}>
            <View className="flex-row items-center mb-3">
                <Ionicons name="location-outline" size={20} color="#FF8C42" />
                <Text className="text-sm text-gray-700 ml-2">{latitude.toFixed(5)}, {longitude.toFixed(5)}</Text>
            </View>
            <TouchableOpacity
                className={`${confirmed ? 'bg-emerald-600' : 'bg-[#1A1A1A]'} items-center py-3`}
                style={{ borderRadius: 8 }}
                onPress={() => onConfirm({ latitude, longitude })}
            >
                <Text className="text-white font-bold">{confirmed ? 'Local confirmado' : 'Confirmar local'}</Text>
            </TouchableOpacity>
        </View>
    );
}
