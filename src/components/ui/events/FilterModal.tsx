import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface FilterCriteria {
    priceMin?: string;
    priceMax?: string;
    cuisine?: string[];
    vibe?: string[];
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

export function FilterModal({ visible, onClose, onApply, initialFilters }: FilterModalProps) {
    const [priceMin, setPriceMin] = useState(initialFilters?.priceMin || '');
    const [priceMax, setPriceMax] = useState(initialFilters?.priceMax || '');
    const [selectedCuisines, setSelectedCuisines] = useState<string[]>(initialFilters?.cuisine || []);
    const [selectedVibes, setSelectedVibes] = useState<string[]>(initialFilters?.vibe || []);

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
        onApply({
            priceMin,
            priceMax,
            cuisine: selectedCuisines,
            vibe: selectedVibes
        });
        onClose();
    };

    const handleClear = () => {
        setPriceMin('');
        setPriceMax('');
        setSelectedCuisines([]);
        setSelectedVibes([]);
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
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Filtros</Text>
                        <TouchableOpacity onPress={handleClear}>
                            <Text style={styles.clearText}>Limpar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
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
                                >
                                    <Text style={[
                                        styles.chipText,
                                        selectedVibes.includes(vibe) && styles.chipTextSelected
                                    ]}>{vibe}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
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
