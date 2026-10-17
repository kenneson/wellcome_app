import { BrandStackHeader, HeaderIconButton } from '@/components/ui/wellcome';
import { EventCreationSaveStatus } from '@/entities/event/model/types';
import { AppIcon } from '@/components/ui/icon';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CreateEventHeaderProps {
  title?: string;
  onBack?: () => void;
  saveStatus?: EventCreationSaveStatus;
  onDiscard?: () => void;
}

const SAVE_LABELS: Partial<Record<EventCreationSaveStatus, string>> = {
  saving: 'Salvando...',
  saved: 'Salvo',
  offline: 'Sem conexão',
  error: 'Sem conexão',
};

/**
 * Orange compact brand header shared by every step of the event creation wizard.
 * Pair it with `BrandSheet` for the step content.
 */
export function CreateEventHeader({
  title = 'Crie seu evento',
  onBack,
  saveStatus,
  onDiscard,
}: CreateEventHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const hasConnectionError = saveStatus === 'error' || saveStatus === 'offline';
  const saveLabel = saveStatus ? SAVE_LABELS[saveStatus] : undefined;

  return (
    <BrandStackHeader
      eyebrow="NOVO EVENTO"
      title={title}
      onBack={handleBack}
      actions={onDiscard ? (
        <HeaderIconButton icon="trash-outline" onPress={onDiscard} accessibilityLabel="Excluir rascunho" />
      ) : undefined}
    >
      {saveLabel ? (
        <View
          style={[styles.savePill, hasConnectionError && styles.savePillError]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Rascunho: ${saveLabel}`}
        >
          <AppIcon
            name={hasConnectionError ? 'cloud-offline-outline' : saveStatus === 'saving' ? 'time-outline' : 'checkmark-circle-outline'}
            size={14}
            color={hasConnectionError ? Palette.danger : '#FFFFFF'}
          />
          <Text style={[styles.saveText, hasConnectionError && styles.saveTextError]}>{saveLabel}</Text>
        </View>
      ) : null}
    </BrandStackHeader>
  );
}

const styles = StyleSheet.create({
  savePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 44 + Spacing.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.onBrandGlass,
  },
  savePillError: {
    backgroundColor: Palette.surface,
  },
  saveText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#FFFFFF',
  },
  saveTextError: {
    color: Palette.danger,
  },
});
