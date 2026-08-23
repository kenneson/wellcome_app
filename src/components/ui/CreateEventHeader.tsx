import { WellcomeIconButton } from '@/components/ui/wellcome';
import { EventCreationSaveStatus } from '@/entities/event/model/types';
import { Box } from '@/shared/ui/box';
import { Text } from '@/shared/ui/text';
import { useRouter } from 'expo-router';
import React from 'react';

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

  return (
    <Box className="min-h-[64px] flex-row items-center border-b border-outline-100 bg-white px-2">
      <WellcomeIconButton icon="chevron-back" onPress={handleBack} accessibilityLabel="Voltar" />

      <Box className="flex-1 items-center px-2">
        <Text className="text-center text-[17px] font-bold text-typography-900" numberOfLines={1}>
          {title}
        </Text>
        {saveStatus && SAVE_LABELS[saveStatus] ? (
          <Text className={`mt-0.5 text-[11px] ${hasConnectionError ? 'text-warning-700' : 'text-typography-400'}`}>
            {SAVE_LABELS[saveStatus]}
          </Text>
        ) : null}
      </Box>

      {onDiscard ? (
        <WellcomeIconButton icon="trash-outline" onPress={onDiscard} accessibilityLabel="Excluir rascunho" danger />
      ) : (
        <Box className="h-12 w-12" />
      )}
    </Box>
  );
}
