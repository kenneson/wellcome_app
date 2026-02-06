import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    TextInput,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { locationService, Municipality, GeocodingResult } from '@/services/api/LocationService';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export type LocationType = 'municipality' | 'address';

interface LocationAutocompleteProps {
    type: LocationType;
    placeholder?: string;
    value?: string;
    onSelectMunicipality?: (municipality: Municipality, coords?: { lat: number; lon: number }) => void;
    onSelectAddress?: (result: GeocodingResult) => void;
    visible?: boolean;
    onClose?: () => void;
    asModal?: boolean;
}

export function LocationAutocomplete({
    type = 'municipality',
    placeholder = 'Digite para buscar...',
    value = '',
    onSelectMunicipality,
    onSelectAddress,
    visible = true,
    onClose,
    asModal = false,
}: LocationAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<(Municipality | GeocodingResult)[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCoords, setLoadingCoords] = useState(false);

    const debouncedQuery = useDebounce(query, 300);

    // Search when debounced query changes
    useEffect(() => {
        async function search() {
            if (!debouncedQuery.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                if (type === 'municipality') {
                    const municipalities = await locationService.searchMunicipalities(debouncedQuery, 10);
                    setResults(municipalities);
                } else {
                    const addresses = await locationService.searchAddresses(debouncedQuery, 5);
                    setResults(addresses);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }

        search();
    }, [debouncedQuery, type]);

    // Preload municipalities on mount if type is municipality
    useEffect(() => {
        if (type === 'municipality') {
            locationService.loadMunicipalities();
        }
    }, [type]);

    const handleSelectMunicipality = async (municipality: Municipality) => {
        setLoadingCoords(true);
        try {
            const coords = await locationService.getMunicipalityCoordinates(municipality);
            onSelectMunicipality?.(municipality, coords || undefined);
        } catch (error) {
            onSelectMunicipality?.(municipality);
        } finally {
            setLoadingCoords(false);
            onClose?.();
        }
    };

    const handleSelectAddress = (result: GeocodingResult) => {
        onSelectAddress?.(result);
        onClose?.();
    };

    const renderItem = ({ item }: { item: Municipality | GeocodingResult }) => {
        if (type === 'municipality') {
            const municipality = item as Municipality;
            return (
                <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelectMunicipality(municipality)}
                >
                    <Ionicons name="location-outline" size={20} color="#FF8C42" />
                    <View style={styles.resultTextContainer}>
                        <Text style={styles.resultText}>{municipality.name}</Text>
                        <Text style={styles.resultSubtext}>{municipality.state}</Text>
                    </View>
                </TouchableOpacity>
            );
        } else {
            const address = item as GeocodingResult;
            return (
                <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelectAddress(address)}
                >
                    <Ionicons name="location-outline" size={20} color="#FF8C42" />
                    <Text style={styles.resultText} numberOfLines={2}>
                        {address.displayName}
                    </Text>
                </TouchableOpacity>
            );
        }
    };

    const content = (
        <View style={[styles.container, asModal && styles.modalContent]}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#999"
                    value={query}
                    onChangeText={setQuery}
                    autoFocus={asModal}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FF8C42" />
                    <Text style={styles.loadingText}>Buscando...</Text>
                </View>
            )}

            {loadingCoords && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FF8C42" />
                    <Text style={styles.loadingText}>Obtendo coordenadas...</Text>
                </View>
            )}

            {!loading && !loadingCoords && results.length > 0 && (
                <FlatList
                    data={results}
                    keyExtractor={(item, index) =>
                        type === 'municipality'
                            ? (item as Municipality).id.toString()
                            : `addr-${index}`
                    }
                    renderItem={renderItem}
                    style={styles.resultsList}
                    keyboardShouldPersistTaps="handled"
                />
            )}

            {!loading && query.length > 2 && results.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
                </View>
            )}
        </View>
    );

    if (asModal) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                transparent={false}
                onRequestClose={onClose}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {type === 'municipality' ? 'Selecione sua cidade' : 'Buscar endereço'}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                    {content}
                </KeyboardAvoidingView>
            </Modal>
        );
    }

    if (!visible) return null;

    return content;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalContent: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeButton: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginVertical: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    loadingText: {
        color: '#666',
        fontSize: 14,
    },
    resultsList: {
        flex: 1,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 12,
    },
    resultTextContainer: {
        flex: 1,
    },
    resultText: {
        fontSize: 16,
        color: '#333',
    },
    resultSubtext: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: '#999',
        fontSize: 14,
        marginTop: 12,
    },
});
