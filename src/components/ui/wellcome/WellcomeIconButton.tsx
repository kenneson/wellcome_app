import { AppIcon } from '@/components/ui/icon';
import { BorderRadius, Palette } from '@/shared/constants/theme';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
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
  color = Palette.ink,
  danger = false,
  disabled = false,
}: WellcomeIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <AppIcon name={icon} size={24} color={danger ? Palette.danger : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Palette.track,
  },
  disabled: {
    opacity: 0.4,
  },
});
