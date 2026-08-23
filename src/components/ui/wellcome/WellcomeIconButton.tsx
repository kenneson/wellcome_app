import { AppIcon } from '@/components/ui/icon';
import { Button } from '@/shared/ui/button';
import React from 'react';
import type { GestureResponderEvent } from 'react-native';

interface WellcomeIconButtonProps {
  icon: string;
  accessibilityLabel: string;
  onPress?: (event: GestureResponderEvent) => void;
  color?: string;
  danger?: boolean;
  disabled?: boolean;
}

export function WellcomeIconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = '#1F2937',
  danger = false,
  disabled = false,
}: WellcomeIconButtonProps) {
  return (
    <Button
      variant="solid"
      action={danger ? 'negative' : 'default'}
      size="lg"
      isDisabled={disabled}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      className="h-12 min-h-12 w-12 rounded-full bg-transparent px-0 data-[active=true]:bg-background-100"
    >
      <AppIcon name={icon} size={24} color={danger ? '#B42318' : color} />
    </Button>
  );
}
