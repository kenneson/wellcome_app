import { AppIcon } from '@/components/ui/icon';
import { Button, ButtonSpinner, ButtonText } from '@/shared/ui/button';
import React from 'react';
import type { GestureResponderEvent } from 'react-native';

type WellcomeButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface WellcomeButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: WellcomeButtonVariant;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
}

const VARIANTS: Record<WellcomeButtonVariant, { button: string; text: string; icon: string }> = {
  primary: {
    button: 'bg-primary-500 data-[active=true]:bg-primary-600',
    text: 'text-white',
    icon: '#FFFFFF',
  },
  secondary: {
    button: 'bg-[#315E9E] data-[active=true]:bg-[#274D82]',
    text: 'text-white',
    icon: '#FFFFFF',
  },
  outline: {
    button: 'bg-white border border-primary-300 data-[active=true]:bg-primary-50',
    text: 'text-primary-700',
    icon: '#BE521F',
  },
  ghost: {
    button: 'bg-transparent data-[active=true]:bg-background-50',
    text: 'text-typography-700',
    icon: '#4B5563',
  },
  danger: {
    button: 'bg-error-500 data-[active=true]:bg-error-600',
    text: 'text-white',
    icon: '#FFFFFF',
  },
};

export function WellcomeButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
}: WellcomeButtonProps) {
  const visual = VARIANTS[variant];
  const blocked = disabled || loading;

  return (
    <Button
      action={variant === 'danger' ? 'negative' : 'primary'}
      variant={variant === 'outline' ? 'outline' : 'solid'}
      size="xl"
      isDisabled={blocked}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      className={`min-h-12 rounded-xl px-5 ${fullWidth ? 'w-full' : ''} ${visual.button}`}
    >
      {loading ? <ButtonSpinner color={visual.icon} /> : icon ? <AppIcon name={icon} size={20} color={visual.icon} /> : null}
      <ButtonText className={`text-base font-bold ${visual.text}`}>{label}</ButtonText>
    </Button>
  );
}
