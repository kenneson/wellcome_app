import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { AppIcon as Ionicons } from '@/components/ui/icon';

interface LocationMapProps {
    latitude: number;
    longitude: number;
    confirmed: boolean;
    onConfirm: (coordinates: { latitude: number; longitude: number }) => void;
}

export function LocationMap({ latitude, longitude, confirmed, onConfirm }: LocationMapProps) {
    const [candidate, setCandidate] = useState({ latitude, longitude });
    const candidateConfirmed = confirmed
        && Math.abs(candidate.latitude - latitude) < 0.000001
        && Math.abs(candidate.longitude - longitude) < 0.000001;

    useEffect(() => setCandidate({ latitude, longitude }), [latitude, longitude]);

    return (
        <View className="overflow-hidden border border-gray-200 bg-gray-50" style={{ borderRadius: 8 }}>
            <MapView
                style={{ width: '100%', height: 210 }}
                region={{ ...candidate, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
                onPress={(event) => setCandidate(event.nativeEvent.coordinate)}
                accessibilityLabel="Mapa para confirmar o local do evento"
            >
                <Marker
                    coordinate={candidate}
                    draggable
                    onDragEnd={(event) => setCandidate(event.nativeEvent.coordinate)}
                />
            </MapView>
            <View className="flex-row items-center justify-between px-4 py-3">
                <Text className="text-xs text-gray-500 flex-1 mr-3">
                    Arraste o pino se precisar ajustar a entrada do local.
                </Text>
                <TouchableOpacity
                    className={`flex-row items-center px-3 py-2 ${candidateConfirmed ? 'bg-emerald-600' : 'bg-[#1A1A1A]'}`}
                    style={{ borderRadius: 8 }}
                    onPress={() => onConfirm(candidate)}
                    accessibilityRole="button"
                    accessibilityLabel="Confirmar pino do evento"
                >
                    <Ionicons name={candidateConfirmed ? 'checkmark-circle' : 'location'} size={17} color="#FFF" />
                    <Text className="text-white text-xs font-bold ml-1.5">{candidateConfirmed ? 'Confirmado' : 'Confirmar'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
