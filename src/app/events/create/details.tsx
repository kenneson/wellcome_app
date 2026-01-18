import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WizardProgress } from '@/components/event-creation/WizardProgress';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEventDetailsViewModel } from '@/viewmodels/events/create/useEventDetailsViewModel';

export default function EventCreateStep4() {
    const router = useRouter();
    const vm = useEventDetailsViewModel();

    const handleBack = () => router.back();

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Crie seu evento</Text>
                <View style={{ width: 60 }} />
            </View>

            <WizardProgress currentStep={3} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Image Picker */}
                <TouchableOpacity style={styles.imagePicker} onPress={vm.pickImage}>
                    {vm.data.details.coverImage ? (
                        <Image source={{ uri: vm.data.details.coverImage }} style={styles.coverImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <IconSymbol name="camera.fill" size={32} color="#FF8C42" />
                            <Text style={styles.imageText}>Adicionar foto de capa</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Mais informações sobre o seu evento</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Título do Evento</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Jantar Italiano na Mooca"
                        value={vm.data.details.title}
                        onChangeText={(text) => vm.updateDetails({ title: text })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descrição do Evento</Text>
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        placeholder="Conte um pouco sobre o que vai rolar..."
                        value={vm.data.details.description}
                        onChangeText={(text) => vm.updateDetails({ description: text })}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Valor por convidado</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0,00"
                        value={vm.data.details.pricePerGuest}
                        onChangeText={(text) => vm.updateDetails({ pricePerGuest: text })}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número máximo de convidados</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Selecione"
                        value={vm.data.details.maxGuests}
                        onChangeText={(text) => vm.updateDetails({ maxGuests: text })}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Data de realização</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => vm.setShowDatePicker(true)}
                    >
                        <Text style={styles.dateText}>{vm.formatDate(vm.data.details.date)}</Text>
                        <IconSymbol name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {vm.showDatePicker && (
                        <DateTimePicker
                            value={vm.data.details.date || new Date()}
                            mode="date"
                            display="default"
                            onChange={vm.handleDateChange}
                        />
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vagas abertas até</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => vm.setShowDeadlinePicker(true)}
                    >
                        <Text style={styles.dateText}>{vm.formatDate(vm.data.details.registrationDeadline)}</Text>
                        <IconSymbol name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {vm.showDeadlinePicker && (
                        <DateTimePicker
                            value={vm.data.details.registrationDeadline || new Date()}
                            mode="date"
                            display="default"
                            onChange={vm.handleDeadlineChange}
                        />
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextButton, vm.submitting && styles.disabledButton]}
                    onPress={vm.handleSubmit}
                    disabled={vm.submitting}
                >
                    {vm.submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.nextButtonText}>Salvar e prosseguir</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 60,
    },
    backText: {
        fontSize: 16,
        marginLeft: 4,
        color: '#000',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
    },
    dateText: {
        fontSize: 16,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    nextButton: {
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    imagePicker: {
        marginBottom: 24,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        backgroundColor: '#F9F9F9',
        height: 200,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    },
});
