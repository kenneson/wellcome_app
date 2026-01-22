import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

export function useEventDetailsViewModel() {
    const router = useRouter();
    const { data, updateDetails, submitEvent } = useEventCreation();
    const [submitting, setSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

    const formatDate = (date: Date | null) => {
        if (!date) return 'Selecione';
        return date.toLocaleDateString('pt-BR');
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            updateDetails({ date: selectedDate });
        }
    };

    const handleDeadlineChange = (event: any, selectedDate?: Date) => {
        setShowDeadlinePicker(Platform.OS === 'ios');
        if (selectedDate) {
            updateDetails({ registrationDeadline: selectedDate });
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 1,
        });

        if (!result.canceled) {
            updateDetails({ coverImage: result.assets[0].uri });
        }
    };

    const handleSubmit = async () => {
        if (!data.details.title || !data.details.pricePerGuest || !data.details.maxGuests || !data.details.date) {
            Alert.alert('Dados incompletos', 'Preencha todos os campos obrigatórios (Título, Preço, Vagas, Data).');
            return;
        }

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

    return {
        data,
        submitting,
        showDatePicker,
        setShowDatePicker,
        showDeadlinePicker,
        setShowDeadlinePicker,
        formatDate,
        handleDateChange,
        handleDeadlineChange,
        pickImage,
        handleSubmit,
        updateDetails
    };
}
