import { WellcomeButton } from '@/components/ui/wellcome/WellcomeButton';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.backdrop} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Fechar seletor" />
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <View style={styles.pickerSurface}>
              <DateTimePicker
                value={value}
                mode={mode}
                display="spinner"
                locale="pt-BR"
                is24Hour
                themeVariant="light"
                textColor={Palette.ink}
                accentColor={Palette.orangeDeep}
                minimumDate={minimumDate}
                onChange={(_, selected) => selected && onChange(selected)}
                style={styles.picker}
              />
            </View>
            <View style={styles.actions}>
              <View style={styles.action}>
                <WellcomeButton label="Cancelar" variant="outline" onPress={onCancel} />
              </View>
              <View style={styles.action}>
                <WellcomeButton label="Confirmar" onPress={onConfirm} />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Palette.scrim,
  },
  safeArea: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: BorderRadius.sheet,
    borderTopRightRadius: BorderRadius.sheet,
    overflow: 'hidden',
  },
  sheet: {
    backgroundColor: Palette.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.line,
    marginBottom: Spacing.sm,
  },
  title: {
    paddingVertical: Spacing.sm,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: Palette.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  action: {
    flex: 1,
  },
  pickerSurface: {
    minHeight: 232,
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    backgroundColor: Palette.surface,
  },
  picker: {
    width: '100%',
    height: 232,
    backgroundColor: Palette.surface,
    opacity: 1,
  },
});
