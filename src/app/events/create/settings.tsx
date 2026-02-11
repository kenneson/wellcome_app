import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { SelectionCard } from '@/components/ui/SelectionCard';

export default function EventCreateSettings() {
    const router = useRouter();
    const {
        data,
        setAccessType,
        addQuestion,
        removeQuestion,
        submitEvent
    } = useEventCreation();

    const [submitting, setSubmitting] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [isRequired, setIsRequired] = useState(false);

    const handleBack = () => router.back();

    const handleAddQuestion = () => {
        if (!newQuestion.trim()) return;
        addQuestion({
            question: newQuestion,
            type: 'TEXT',
            required: isRequired
        });
        setNewQuestion('');
        setIsRequired(false);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await submitEvent();
            Alert.alert('Sucesso', 'Evento criado com sucesso!', [
                { text: 'OK', onPress: () => router.push('/(tabs)') }
            ]);
        } catch (error: any) {
            Alert.alert('Erro', `Não foi possível criar o evento: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Configurações</Text>
                <View style={{ width: 60 }} />
            </View>

            <WizardProgress currentStep={4} />

            <ScrollView contentContainerStyle={styles.content}>

                <Text style={styles.sectionTitle}>Tipo de Acesso</Text>
                <Text style={styles.sectionSubtitle}>Quem pode participar do seu evento?</Text>

                <View style={styles.selectionContainer}>
                    <SelectionCard
                        label="Aberto a todos"
                        description="Qualquer pessoa pode se inscrever e participar instantaneamente."
                        selected={data.details.accessType === 'OPEN'}
                        onPress={() => setAccessType('OPEN')}
                        style={styles.card}
                    />
                    <SelectionCard
                        label="Requer Aprovação"
                        description="Os interessados solicitam participar e você aprova ou rejeita."
                        selected={data.details.accessType === 'OPEN_WITH_APPROVAL'}
                        onPress={() => setAccessType('OPEN_WITH_APPROVAL')}
                        style={styles.card}
                    />
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Perguntas aos Convidados</Text>
                <Text style={styles.sectionSubtitle}>Adicione perguntas para os convidados responderem na inscrição.</Text>

                {data.details.questions && data.details.questions.length > 0 && (
                    <View style={styles.questionsList}>
                        {data.details.questions.map((q, index) => (
                            <View key={index} style={styles.questionItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.questionText}>{q.question}</Text>
                                    <Text style={styles.questionType}>
                                        {q.required ? 'Obrigatória' : 'Opcional'} • Texto
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => removeQuestion(index)} style={styles.deleteButton}>
                                    <IconSymbol name="trash" size={20} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.addQuestionContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ex: Qual seu perfil no Instagram?"
                        placeholderTextColor="#666"
                        value={newQuestion}
                        onChangeText={setNewQuestion}
                    />

                    <View style={styles.questionControls}>
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchLabel}>Obrigatória?</Text>
                            <Switch
                                value={isRequired}
                                onValueChange={setIsRequired}
                                trackColor={{ false: '#767577', true: '#FF8C42' }}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.addButton, !newQuestion.trim() && styles.disabledButton]}
                            onPress={handleAddQuestion}
                            disabled={!newQuestion.trim()}
                        >
                            <Text style={styles.addButtonText}>Adicionar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextButton, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.nextButtonText}>Criar Evento</Text>
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
        marginBottom: 8,
        marginTop: 10,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    selectionContainer: {
        gap: 12,
    },
    card: {
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 24,
    },
    questionsList: {
        marginBottom: 16,
        gap: 12,
    },
    questionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    questionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
    },
    questionType: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    deleteButton: {
        padding: 8,
    },
    addQuestionContainer: {
        backgroundColor: '#F5F5F5',
        padding: 16,
        borderRadius: 12,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    questionControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    switchLabel: {
        fontSize: 14,
        color: '#666',
    },
    addButton: {
        backgroundColor: '#000',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
});
