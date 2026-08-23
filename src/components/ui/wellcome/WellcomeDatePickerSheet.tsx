import { WellcomeButton } from '@/components/ui/wellcome/WellcomeButton';
import { Box } from '@/shared/ui/box';
import { Text } from '@/shared/ui/text';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WellcomeDatePickerSheetProps {
  visible: boolean;
  title: string;
  value: Date;
  mode: 'date' | 'time';
  minimumDate?: Date;
  reducedMotion?: boolean;
  onChange: (value: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function WellcomeDatePickerSheet({
  visible,
  title,
  value,
  mode,
  minimumDate,
  reducedMotion = false,
  onChange,
  onCancel,
  onConfirm,
}: WellcomeDatePickerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      presentationStyle="overFullScreen"
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onCancel}
    >
      <Box className="flex-1 justify-end bg-black/50" accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Fechar seletor" />
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <Box className="rounded-t-3xl bg-white px-5 pb-3 pt-2">
            <Box className="mb-2 h-1 w-10 self-center rounded-full bg-outline-200" />
            <Text className="py-2 text-center text-lg font-bold text-typography-900">{title}</Text>
            <Box style={styles.pickerSurface}>
              <DateTimePicker
                value={value}
                mode={mode}
                display="spinner"
                locale="pt-BR"
                is24Hour
                themeVariant="light"
                textColor="#111827"
                accentColor="#C45D22"
                minimumDate={minimumDate}
                onChange={(_, selected) => selected && onChange(selected)}
                style={styles.picker}
              />
            </Box>
            <Box className="mt-3 flex-row gap-3">
              <Box className="flex-1">
                <WellcomeButton label="Cancelar" variant="ghost" onPress={onCancel} />
              </Box>
              <Box className="flex-1">
                <WellcomeButton label="Confirmar" onPress={onConfirm} />
              </Box>
            </Box>
          </Box>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  pickerSurface: {
    minHeight: 232,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    width: '100%',
    height: 232,
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },
});
