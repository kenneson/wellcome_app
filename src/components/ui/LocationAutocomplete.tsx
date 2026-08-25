import { GeocodingResult, GeocodingSuggestion, locationService, Municipality } from '@/services/api/LocationService';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { hasUsableGeocodingResult, isCompleteGeocodingResult } from './locationAutocompleteUtils';
import * as Crypto from 'expo-crypto';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

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
    onSelectAddress?: (result: GeocodingResult, complete: boolean) => void;
    allowIncompleteAddress?: boolean;
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
    allowIncompleteAddress = false,
    visible = true,
    onClose,
    asModal = false,
}: LocationAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<(Municipality | GeocodingSuggestion)[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCoords, setLoadingCoords] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [sessionToken, setSessionToken] = useState(() => Crypto.randomUUID());
    const wasVisible = useRef(false);
    const reducedMotion = useReducedMotion();
    const debouncedQuery = useDebounce(query, 300);
    const insets = useSafeAreaInsets();
    // Native modals can lose the provider measurement on iOS. The initial
    // window metrics preserve the Dynamic Island/notch inset in that case.
    const modalTopInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
    const modalBottomInset = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0);

    // Search when debounced query changes
    useEffect(() => {
        let cancelled = false;

        async function search() {
            if ((asModal && !visible) || !debouncedQuery.trim()) {
                setResults([]);
                setErrorMessage('');
                setLoading(false);
                return;
            }

            setLoading(true);
            setErrorMessage('');
            try {
                if (type === 'municipality') {
                    const municipalities = await locationService.searchMunicipalities(debouncedQuery, 10);
                    if (!cancelled) setResults(municipalities);
                } else {
                    const addresses = await locationService.searchAddresses(debouncedQuery, sessionToken);
                    if (!cancelled) setResults(addresses);
                }
            } catch (error: any) {
                if (!cancelled) {
                    setResults([]);
                    setErrorMessage(error?.message || 'Não foi possível buscar endereços');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void search();

        return () => {
            cancelled = true;
        };
    }, [asModal, debouncedQuery, sessionToken, type, visible]);

    useEffect(() => {
        if (visible && !wasVisible.current) {
            setQuery(value);
            setResults([]);
            setErrorMessage('');
            if (type === 'address') setSessionToken(Crypto.randomUUID());
        }
        wasVisible.current = visible;
    }, [visible, value, type]);

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
        } catch {
            onSelectMunicipality?.(municipality);
        } finally {
            setLoadingCoords(false);
            onClose?.();
        }
    };

    const handleSelectAddress = async (suggestion: GeocodingSuggestion) => {
        setLoadingCoords(true);
        setErrorMessage('');
        try {
            const result = await locationService.retrieveAddress(suggestion.id, sessionToken);
            if (!hasUsableGeocodingResult(result)) {
                setErrorMessage('Este resultado não possui uma localização exata. Escolha outra opção abaixo ou ajuste a busca.');
                return;
            }

            const complete = isCompleteGeocodingResult(result);
            if (!complete && !allowIncompleteAddress) {
                setErrorMessage('Este resultado não possui cidade e estado completos. Escolha outra opção abaixo.');
                return;
            }

            onSelectAddress?.(result, complete);
            onClose?.();
        } catch (error: any) {
            setErrorMessage(error?.message || 'Não foi possível confirmar o endereço. Você pode tentar outra opção.');
        } finally {
            setLoadingCoords(false);
        }
    };

    const renderItem = ({ item }: { item: Municipality | GeocodingSuggestion }) => {
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
            const address = item as GeocodingSuggestion;
            return (
                <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelectAddress(address)}
                >
                    <Ionicons name="location-outline" size={20} color="#FF8C42" />
                    <View style={styles.resultTextContainer}>
                        <Text style={styles.resultText}>{address.name}</Text>
                        <Text style={styles.resultSubtext} numberOfLines={2}>{address.description}</Text>
                    </View>
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
                    onChangeText={(nextQuery) => {
                        setQuery(nextQuery);
                        setErrorMessage('');
                    }}
                    autoFocus={asModal}
                    autoCorrect={false}
                    clearButtonMode="never"
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setQuery('')}
                        style={styles.clearButton}
                        accessibilityRole="button"
                        accessibilityLabel="Limpar busca"
                    >
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

            {!!errorMessage && !loading && !loadingCoords && (
                <View style={styles.loadingContainer} accessibilityRole="alert">
                    <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
                    <Text style={[styles.loadingText, { color: '#B45309' }]}>{errorMessage}</Text>
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
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    contentContainerStyle={styles.resultsContent}
                />
            )}

            {!loading && query.length > 2 && results.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={40} color="#ccc" />
                    <Text style={styles.emptyText}>Nenhum resultado encontrado</Text>
                </View>
            )}

            {type === 'address' && query.length > 2 && (
                <TouchableOpacity
                    accessibilityRole="link"
                    onPress={() => void Linking.openURL('https://www.geoapify.com/')}
                    style={styles.attribution}
                >
                    <Text style={styles.attributionText}>Powered by Geoapify</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (asModal) {
        return (
            <Modal
                visible={visible}
                animationType={reducedMotion ? 'none' : 'slide'}
                transparent={false}
                presentationStyle="fullScreen"
                statusBarTranslucent={false}
                navigationBarTranslucent={false}
                onRequestClose={onClose}
            >
                <View
                    style={[
                        styles.modalContainer,
                        { paddingTop: modalTopInset, paddingBottom: modalBottomInset },
                    ]}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar busca de endereço"
                            testID="location-modal-close"
                        >
                            <Ionicons name="close" size={24} color="#202124" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle} numberOfLines={1}>
                            {type === 'municipality' ? 'Selecione sua cidade' : 'Buscar endereço'}
                        </Text>
                        <View style={styles.headerSpacer} />
                    </View>
                    <KeyboardAvoidingView
                        style={styles.modalBody}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={0}
                    >
                        {content}
                    </KeyboardAvoidingView>
                </View>
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
    modalBody: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 6,
        minHeight: 64,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    headerSpacer: {
        width: 48,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginVertical: 12,
        minHeight: 52,
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
    clearButton: {
        width: 44,
        height: 44,
        marginRight: -12,
        alignItems: 'center',
        justifyContent: 'center',
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
    resultsContent: {
        paddingBottom: 16,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 64,
        paddingVertical: 12,
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
    attribution: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: 16,
    },
    attributionText: {
        color: '#6B7280',
        fontSize: 12,
        textDecorationLine: 'underline',
    },
});
