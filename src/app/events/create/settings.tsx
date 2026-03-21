import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { SelectionCard } from '@/components/ui/SelectionCard';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventCreateSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 375;
    const horizontalPadding = isSmallScreen ? 16 : width >= 414 ? 24 : 20;
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
    const questionInputRef = useRef<TextInput>(null);

    const handleBack = () => router.back();

    const handleAddQuestion = () => {
        if (!newQuestion.trim()) return;
        addQuestion({
            question: newQuestion,
            questionType: 'TEXT',
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader title="Ajustes finais" />

            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <View className="mb-6">
                    <Text style={{ fontSize: isSmallScreen ? 24 : 28 }} className="font-extrabold text-[#1A1A1A] mb-2 leading-tight">
                        Ajustes finais
                    </Text>
                    <Text className="text-sm text-gray-400">
                        Quem pode participar e perguntas extras.
                    </Text>
                </View>

                <View className="mb-6">
                    <WizardProgress currentStep={4} />
                </View>

                <View className="bg-gray-50 rounded-2xl mb-6" style={{ padding: isSmallScreen ? 14 : 20 }}>
                    <Text style={{ fontSize: isSmallScreen ? 16 : 18 }} className="font-bold mb-4 text-[#1A1A1A]">Tipo de Acesso</Text>
                    <View className="gap-3">
                        <SelectionCard
                            label="Aberto a todos"
                            description="Qualquer pessoa pode se inscrever e participar instantaneamente."
                            selected={data.details.accessType === 'OPEN'}
                            onPress={() => setAccessType('OPEN')}
                        />
                        <SelectionCard
                            label="Requer Aprovação"
                            description="Os interessados solicitam participar e você aprova ou rejeita."
                            selected={data.details.accessType === 'OPEN_WITH_APPROVAL'}
                            onPress={() => setAccessType('OPEN_WITH_APPROVAL')}
                        />
                    </View>
                </View>

                <Text style={{ fontSize: isSmallScreen ? 18 : 20 }} className="font-bold text-[#1A1A1A] mb-4">Perguntas aos Convidados</Text>

                {data.details.questions && data.details.questions.length > 0 && (
                    <View className="mb-4 gap-3">
                        {data.details.questions.map((q, index) => (
                            <View key={index} className="flex-row items-center bg-white rounded-2xl border border-gray-100" style={{ padding: isSmallScreen ? 12 : 16 }}>
                                <View className="flex-1">
                                    <Text className="text-base font-bold text-[#1A1A1A]">{q.question}</Text>
                                    <Text className="text-xs text-gray-500 mt-1">
                                        {q.required ? 'Obrigatória • Texto' : 'Opcional • Texto'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => removeQuestion(index)} className="p-2">
                                    <IconSymbol name="trash" size={20} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <View className="bg-gray-50 rounded-2xl" style={{ padding: isSmallScreen ? 14 : 20 }}>
                    <Text className="text-sm font-bold text-gray-900 mb-3">Adicionar nova pergunta</Text>
                    <TextInput
                        ref={questionInputRef}
                        className="bg-white border border-gray-200 rounded-xl text-base mb-4 text-[#1A1A1A]"
                        style={{ padding: isSmallScreen ? 12 : 16 }}
                        placeholder="Ex: Qual seu perfil no Instagram?"
                        placeholderTextColor="#D1D5DB"
                        value={newQuestion}
                        onChangeText={setNewQuestion}

                    />

                    <View className={`${isSmallScreen ? 'flex-col gap-3' : 'flex-row'} justify-between items-center`}>
                        <View className="flex-row items-center gap-2">
                            <Switch
                                value={isRequired}
                                onValueChange={setIsRequired}
                                trackColor={{ false: '#E5E7EB', true: '#FF8C42' }}
                                thumbColor={isRequired ? '#FFF' : '#F9FAFB'}
                            />
                            <Text className="text-sm text-gray-600 font-medium">Pergunta obrigatória</Text>
                        </View>
                        <TouchableOpacity
                            className={`bg-[#1A1A1A] rounded-xl ${!newQuestion.trim() ? 'opacity-40' : ''}`}
                            style={{ paddingHorizontal: isSmallScreen ? 16 : 24, paddingVertical: 12 }}
                            onPress={handleAddQuestion}
                            disabled={!newQuestion.trim()}
                        >
                            <Text className="text-white text-sm font-bold">Adicionar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAwareScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100"
                style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    paddingHorizontal: horizontalPadding,
                    paddingTop: 14,
                }}
            >
                <TouchableOpacity
                    className={`h-[52px] rounded-2xl items-center justify-center ${submitting ? 'bg-gray-400' : 'bg-[#FF8C42]'}`}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                    style={!submitting ? {
                        shadowColor: '#FF8C42',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 4,
                    } : undefined}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text className="text-white text-[16px] font-bold">Publicar Evento</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
