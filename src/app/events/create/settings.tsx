import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SelectionCard } from '@/components/ui/SelectionCard';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { firstInvalidStep, validateCompleteEvent } from '@/features/create-event/model/eventCreationValidation';
import { EVENT_CREATION_RETURN_ROUTE } from '@/features/create-event/model/payoutReturn';
import { EventDraftApiError } from '@/services/api/EventDraftService';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const STEP_ROUTES = ['/events/create', '/events/create/menu', '/events/create/location', '/events/create/details'] as const;

export default function EventCreateReview() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const creation = useEventCreation();
    const { setCurrentStep } = creation;
    const [submitting, setSubmitting] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [isRequired, setIsRequired] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => setCurrentStep(4), [setCurrentStep]);

    const addQuestion = () => {
        const question = newQuestion.trim();
        if (question.length < 5 || creation.data.details.questions.length >= 5) return;
        creation.addQuestion({ question, questionType: 'TEXT', required: isRequired, options: [] });
        setNewQuestion('');
        setIsRequired(false);
    };

    const goToFirstError = (fieldErrors: Record<string, string>) => {
        const step = firstInvalidStep(fieldErrors);
        if (step < 4) router.replace(STEP_ROUTES[step] as any);
    };

    const openPayoutSetup = (path: '/profile/pix-key' | '/kyc') => {
        router.push({
            pathname: path,
            params: {
                returnTo: EVENT_CREATION_RETURN_ROUTE,
                draftId: creation.draftId ?? '',
            },
        } as any);
    };

    const handlePublish = async () => {
        if (submitting) return;
        const localErrors = validateCompleteEvent(creation.data);
        setErrors(localErrors);
        if (Object.keys(localErrors).length > 0) {
            Alert.alert('Revise o evento', Object.values(localErrors)[0], [
                { text: 'Agora não', style: 'cancel' },
                { text: 'Corrigir', onPress: () => goToFirstError(localErrors) },
            ]);
            return;
        }

        setSubmitting(true);
        try {
            const event = await creation.publishDraft();
            router.replace(`/events/${event.id}` as any);
        } catch (error: any) {
            const apiError = error as EventDraftApiError;
            setErrors(apiError.fieldErrors ?? {});
            if (apiError.code === 'HOST_PAYOUT_SETUP_REQUIRED') {
                const missingPix = !!apiError.fieldErrors?.pixKey;
                Alert.alert('Configure o recebimento', apiError.message, [
                    { text: 'Agora não', style: 'cancel' },
                    { text: missingPix ? 'Cadastrar Pix' : 'Verificar identidade', onPress: () => openPayoutSetup(missingPix ? '/profile/pix-key' : '/kyc') },
                ]);
            } else if (apiError.code === 'INVALID_EVENT') {
                Alert.alert('Revise o evento', apiError.message, [{ text: 'Corrigir', onPress: () => goToFirstError(apiError.fieldErrors) }]);
            } else {
                Alert.alert('Não foi possível publicar', apiError.message || 'Tente novamente em instantes.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const eventDate = creation.data.details.date;
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader title="Revisar evento" saveStatus={creation.saveStatus} />
            <KeyboardAwareScrollView contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 130 }} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                <WizardProgress currentStep={4} />
                <Text className="text-2xl font-extrabold text-[#1A1A1A] mt-3">Tudo pronto?</Text>
                <Text className="text-sm text-gray-500 mt-1 mb-5">Confira como seu evento será apresentado antes de publicar.</Text>

                <View className="border border-gray-200 bg-white overflow-hidden mb-6" style={{ borderRadius: 8 }}>
                    {creation.data.details.coverImage && <Image source={{ uri: creation.data.details.coverImage }} style={{ width: '100%', height: 170 }} contentFit="cover" />}
                    <View className="p-4">
                        <Text className="text-xl font-extrabold text-[#1A1A1A]">{creation.data.details.title || 'Evento sem título'}</Text>
                        <Text className="text-sm text-gray-600 mt-2">{creation.data.details.description}</Text>
                        <SummaryRow icon="calendar-outline" text={eventDate ? eventDate.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Data pendente'} />
                        <SummaryRow icon="location-outline" text={[creation.data.location.city, creation.data.location.state].filter(Boolean).join(' - ') || 'Local pendente'} />
                        <SummaryRow icon="restaurant-outline" text={`${creation.data.dishes.length} ${creation.data.dishes.length === 1 ? 'item no cardápio' : 'itens no cardápio'}`} />
                        <SummaryRow icon="people-outline" text={`${creation.data.details.maxGuests || 0} vagas · R$ ${creation.data.details.pricePerGuest || '0,00'} por pessoa`} />
                    </View>
                </View>

                <ReviewSection title="Experiencia" onEdit={() => router.push('/events/create')}>
                    <ReviewLine label="Tipo" value={creation.data.eventType || 'Pendente'} />
                    <ReviewLine label="Culinarias" value={creation.data.cuisineTypes.join(', ') || 'Pendentes'} />
                </ReviewSection>

                <ReviewSection title="Cardapio" onEdit={() => router.push('/events/create/menu')}>
                    {creation.data.dishes.map((dish, index) => (
                        <View key={dish.id} className="py-2 border-b border-gray-100 last:border-b-0">
                            <Text className="text-sm font-bold text-[#1A1A1A]">{index + 1}. {dish.name || 'Prato pendente'}</Text>
                            <Text className="text-xs text-gray-500 mt-0.5">{dish.category.replace('_', ' ').toLocaleLowerCase('pt-BR')}{dish.description ? ` · ${dish.description}` : ''}</Text>
                        </View>
                    ))}
                    <ReviewLine label="Servico" value={creation.data.isServedInSequence ? 'Em sequencia' : 'Livre'} />
                </ReviewSection>

                <ReviewSection title="Local" onEdit={() => router.push('/events/create/location')}>
                    <Text className="text-sm text-[#1A1A1A]">{creation.data.location.address || 'Endereco pendente'}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{[creation.data.location.city, creation.data.location.state].filter(Boolean).join(' - ') || 'Cidade pendente'}</Text>
                    <View className="flex-row items-center mt-2">
                        <Ionicons name={creation.data.location.confirmed ? 'checkmark-circle' : 'alert-circle'} size={16} color={creation.data.location.confirmed ? '#16804B' : '#B45309'} />
                        <Text className={`text-xs ml-1.5 ${creation.data.location.confirmed ? 'text-emerald-700' : 'text-amber-700'}`}>{creation.data.location.confirmed ? 'Pino confirmado' : 'Pino pendente'}</Text>
                    </View>
                </ReviewSection>

                <ReviewSection title="Data e valor" onEdit={() => router.push('/events/create/details')}>
                    <ReviewLine label="Inicio" value={eventDate ? eventDate.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pendente'} />
                    <ReviewLine label="Termino" value={creation.data.details.endTime ? creation.data.details.endTime.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pendente'} />
                    <ReviewLine label="Inscricoes ate" value={creation.data.details.registrationDeadline ? creation.data.details.registrationDeadline.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Ate o inicio'} />
                    <ReviewLine label="Vagas" value={creation.data.details.maxGuests || 'Pendente'} />
                    <ReviewLine label="Valor por pessoa" value={`R$ ${creation.data.details.pricePerGuest || '0,00'}`} />
                </ReviewSection>

                <Text className="text-lg font-bold text-[#1A1A1A] mb-3">Como as pessoas participam?</Text>
                <View className="gap-3 mb-6">
                    <SelectionCard
                        label="Inscrição imediata"
                        description="Após o pagamento, a participação é confirmada automaticamente."
                        selected={creation.data.details.accessType === 'OPEN'}
                        onPress={() => creation.setAccessType('OPEN')}
                    />
                    <SelectionCard
                        label="Requer minha aprovação"
                        description="Você analisa a solicitação antes da confirmação e do pagamento."
                        selected={creation.data.details.accessType === 'OPEN_WITH_APPROVAL'}
                        onPress={() => creation.setAccessType('OPEN_WITH_APPROVAL')}
                    />
                </View>

                <View className="flex-row justify-between items-end mb-3">
                    <View className="flex-1"><Text className="text-lg font-bold text-[#1A1A1A]">Perguntas aos convidados</Text><Text className="text-sm text-gray-500 mt-1">Opcional, até cinco perguntas.</Text></View>
                    <Text className="text-xs text-gray-400">{creation.data.details.questions.length}/5</Text>
                </View>

                {creation.data.details.questions.map((question, index) => (
                    <View key={`${question.question}-${index}`} className="flex-row items-center border border-gray-200 px-4 py-3 mb-2" style={{ borderRadius: 8 }}>
                        <View className="flex-1"><Text className="text-sm font-bold text-[#1A1A1A]">{question.question}</Text><Text className="text-xs text-gray-500 mt-1">{question.required ? 'Obrigatória' : 'Opcional'}</Text></View>
                        <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={() => creation.removeQuestion(index)} accessibilityLabel="Remover pergunta"><Ionicons name="trash-outline" size={20} color="#B33A34" /></TouchableOpacity>
                    </View>
                ))}

                <View className="bg-gray-50 border border-gray-200 p-4 mb-5" style={{ borderRadius: 8 }}>
                    <TextInput
                        className="bg-white border border-gray-200 px-4 py-3 text-base"
                        style={{ borderRadius: 8 }}
                        placeholder="Ex: Você possui alguma alergia?"
                        value={newQuestion}
                        maxLength={180}
                        onChangeText={setNewQuestion}
                    />
                    <View className="flex-row items-center justify-between mt-3">
                        <View className="flex-row items-center"><Switch value={isRequired} onValueChange={setIsRequired} trackColor={{ false: '#D1D5DB', true: '#FF8C42' }} /><Text className="text-sm text-gray-700 ml-2">Obrigatória</Text></View>
                        <TouchableOpacity className="bg-[#1A1A1A] px-4 py-3" style={{ borderRadius: 8, opacity: newQuestion.trim().length >= 5 ? 1 : 0.4 }} disabled={newQuestion.trim().length < 5} onPress={addQuestion}><Text className="text-white font-bold">Adicionar</Text></TouchableOpacity>
                    </View>
                </View>

                {!!Object.keys(errors).length && <TouchableOpacity className="border border-red-300 bg-red-50 p-4" style={{ borderRadius: 8 }} onPress={() => goToFirstError(errors)}><Text className="text-red-800 font-bold">Há {Object.keys(errors).length} pendência(s) para revisar</Text><Text className="text-red-700 text-sm mt-1">Toque para voltar ao primeiro campo.</Text></TouchableOpacity>}
            </KeyboardAwareScrollView>

            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100" style={{ paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: horizontalPadding, paddingTop: 12 }}>
                <TouchableOpacity className={`h-[52px] items-center justify-center ${submitting ? 'bg-gray-400' : 'bg-[#FF8C42]'}`} style={{ borderRadius: 8 }} disabled={submitting} onPress={() => void handlePublish()}>
                    {submitting ? <View className="flex-row items-center"><ActivityIndicator color="#FFF" /><Text className="text-white font-bold ml-2">Publicando...</Text></View> : <Text className="text-white text-base font-bold">Publicar evento</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

function SummaryRow({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
    return <View className="flex-row items-center mt-3"><Ionicons name={icon} size={17} color="#73787E" /><Text className="text-sm text-gray-700 ml-2 flex-1">{text}</Text></View>;
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
    return (
        <View className="border-t border-gray-200 py-5">
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-extrabold text-[#1A1A1A]">{title}</Text>
                <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar ${title}`}>
                    <Ionicons name="pencil" size={19} color="#C45D22" />
                </TouchableOpacity>
            </View>
            {children}
        </View>
    );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
    return <View className="flex-row justify-between gap-4 py-1.5"><Text className="text-sm text-gray-500">{label}</Text><Text className="text-sm text-[#1A1A1A] font-semibold text-right flex-1">{value}</Text></View>;
}
