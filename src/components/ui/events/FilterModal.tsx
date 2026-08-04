import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export interface FilterCriteria {
    priceMin?: string;
    priceMax?: string;
    cuisine?: string[];
    vibe?: string[];
    radiusInKm?: number;
}

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterCriteria) => void;
    initialFilters?: FilterCriteria;
}

const CUISINE_TYPES = [
    'Brasileira', 'Italiana', 'Japonesa', 'Mexicana',
    'Árabe', 'Vegana', 'Vegetariana', 'Churrasco',
    'Pizza', 'Hamburguer', 'Doces', 'Variada'
];

const VIBES = [
    'Família', 'Networking', 'Espiritual', 'Casual',
    'Romântico', 'Festa', 'Jantar a dois', 'Negócios'
];

const DEFAULT_RADIUS_KM = 60;
const RADIUS_OPTIONS = [10, 25, 60, 100];

export function FilterModal({ visible, onClose, onApply, initialFilters }: FilterModalProps) {
    const [priceMin, setPriceMin] = useState(initialFilters?.priceMin || '');
    const [priceMax, setPriceMax] = useState(initialFilters?.priceMax || '');
    const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialFilters?.cuisine || []);
    const [selectedVibes, setSelectedVibes] = useState<string[]>(initialFilters?.vibe || []);
    const [radiusInKm, setRadiusInKm] = useState(initialFilters?.radiusInKm || DEFAULT_RADIUS_KM);

    useEffect(() => {
        if (!visible) return;

        setPriceMin(initialFilters?.priceMin || '');
        setPriceMax(initialFilters?.priceMax || '');
        setSelectedCuisines(initialFilters?.cuisine || []);
        setSelectedVibes(initialFilters?.vibe || []);
        setRadiusInKm(initialFilters?.radiusInKm || DEFAULT_RADIUS_KM);
    }, [initialFilters, visible]);

    const toggleCuisine = (cuisine: string) => {
        if (selectedCuisines.includes(cuisine)) {
            setSelectedCuisines(prev => prev.filter(c => c !== cuisine));
        } else {
            setSelectedCuisines(prev => [...prev, cuisine]);
        }
    };

    const toggleVibe = (vibe: string) => {
        if (selectedVibes.includes(vibe)) {
            setSelectedVibes(prev => prev.filter(v => v !== vibe));
        } else {
            setSelectedVibes(prev => [...prev, vibe]);
        }
    };

    const handleApply = () => {
        const normalizedMin = priceMin.trim().replace(',', '.');
        const normalizedMax = priceMax.trim().replace(',', '.');
        const minValue = normalizedMin ? Number(normalizedMin) : undefined;
        const maxValue = normalizedMax ? Number(normalizedMax) : undefined;

        if ((minValue !== undefined && !Number.isFinite(minValue)) ||
            (maxValue !== undefined && !Number.isFinite(maxValue))) {
            Alert.alert('Valor inválido', 'Informe apenas números na faixa de preço.');
            return;
        }

        if (minValue !== undefined && maxValue !== undefined && minValue > maxValue) {
            Alert.alert('Faixa de preço inválida', 'O valor mínimo deve ser menor que o valor máximo.');
            return;
        }

        onApply({
            priceMin: normalizedMin,
            priceMax: normalizedMax,
            cuisine: selectedCuisines,
            vibe: selectedVibes,
            radiusInKm,
        });
        onClose();
    };

    const handleClear = () => {
        setPriceMin('');
        setPriceMax('');
        setSelectedCuisines([]);
        setSelectedVibes([]);
        setRadiusInKm(DEFAULT_RADIUS_KM);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.headerAction}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar filtros"
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Filtros</Text>
                        <TouchableOpacity
                            onPress={handleClear}
                            style={styles.headerAction}
                            accessibilityRole="button"
                            accessibilityLabel="Limpar filtros"
                        >
                            <Text style={styles.clearText}>Limpar</Text>
                        </TouchableOpacity>
                    </View>

                    <KeyboardAwareScrollView
                        enableOnAndroid={true}
                        extraScrollHeight={40}
                        extraHeight={120}
                        enableResetScrollToCoords={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.content}
                    >
                        <Text style={styles.sectionTitle}>Distância</Text>
                        <View style={styles.radiusOptions}>
                            {RADIUS_OPTIONS.map((radius) => (
                                <TouchableOpacity
                                    key={radius}
                                    style={[
                                        styles.radiusOption,
                                        radiusInKm === radius && styles.radiusOptionSelected,
                                    ]}
                                    onPress={() => setRadiusInKm(radius)}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: radiusInKm === radius }}
                                    accessibilityLabel={`Buscar eventos em até ${radius} quilômetros`}
                                >
                                    <Text style={[
                                        styles.radiusOptionText,
                                        radiusInKm === radius && styles.radiusOptionTextSelected,
                                    ]}>
                                        {radius} km
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider} />

                        {/* Price Range */}
                        <Text style={styles.sectionTitle}>Faixa de Preço</Text>
                        <View style={styles.row}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.currencyPrefix}>R$</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mín"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                    value={priceMin}
                                    onChangeText={setPriceMin}
                                />
                            </View>
                            <Text style={styles.separator}>-</Text>
                            <View style={styles.inputContainer}>
                                <Text style={styles.currencyPrefix}>R$</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Máx"
                                    placeholderTextColor="#999"
                                    keyboardType="numeric"
                                    value={priceMax}
                                    onChangeText={setPriceMax}
                                />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Cuisine */}
                        <Text style={styles.sectionTitle}>Tipo de Comida</Text>
                        <View style={styles.chipsContainer}>
                            {CUISINE_TYPES.map(cuisine => (
                                <TouchableOpacity
                                    key={cuisine}
                                    style={[
                                        styles.chip,
                                        selectedCuisines.includes(cuisine) && styles.chipSelected
                                    ]}
                                    onPress={() => toggleCuisine(cuisine)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: selectedCuisines.includes(cuisine) }}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedCuisines.includes(cuisine) && styles.chipTextSelected
                                    ]}>{cuisine}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.divider} />

                        {/* Vibe */}
                        <Text style={styles.sectionTitle}>Clima do Evento</Text>
                        <View style={styles.chipsContainer}>
                            {VIBES.map(vibe => (
                                <TouchableOpacity
                                    key={vibe}
                                    style={[
                                        styles.chip,
                                        selectedVibes.includes(vibe) && styles.chipSelected
                                    ]}
                                    onPress={() => toggleVibe(vibe)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: selectedVibes.includes(vibe) }}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedVibes.includes(vibe) && styles.chipTextSelected
                                    ]}>{vibe}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ height: 40 }} />
                    </KeyboardAwareScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={handleApply}
                            accessibilityRole="button"
                            accessibilityLabel="Aplicar filtros"
                        >
                            <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        display: 'flex',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerAction: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    clearText: {
        fontSize: 14,
        color: '#FF8C42',
        fontWeight: '600',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    radiusOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    radiusOption: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FAFAFA',
    },
    radiusOptionSelected: {
        borderColor: '#FF8C42',
        backgroundColor: '#FFF0E6',
    },
    radiusOptionText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    radiusOptionTextSelected: {
        color: '#FF8C42',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48,
        backgroundColor: '#FAFAFA',
    },
    currencyPrefix: {
        fontSize: 16,
        color: '#333',
        marginRight: 4,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    separator: {
        marginHorizontal: 12,
        fontSize: 20,
        color: '#999',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 24,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        minHeight: 44,
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipSelected: {
        backgroundColor: '#FFF0E6',
        borderColor: '#FF8C42',
    },
    chipText: {
        fontSize: 14,
        color: '#666',
    },
    chipTextSelected: {
        color: '#FF8C42',
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    applyButton: {
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
