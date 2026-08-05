import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useEventCreation } from '@/shared/context/EventCreationContext';

export function useEventDetailsViewModel() {
    const { data, updateDetails } = useEventCreation();

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.82,
        });
        if (!result.canceled && result.assets[0]?.uri) {
            const compressed = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [],
                { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
            );
            updateDetails({ coverImage: compressed.uri });
        }
    };

    return { data, updateDetails, pickImage };
}
