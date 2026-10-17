import { AppIcon } from '@/components/ui/icon';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
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

const VARIANTS: Record<WellcomeButtonVariant, { background: string; pressed: string; border: string; text: string }> = {
  primary: { background: Palette.orange, pressed: Palette.orangeDeep, border: Palette.orange, text: '#FFFFFF' },
  secondary: { background: Palette.blue, pressed: Palette.ink, border: Palette.blue, text: '#FFFFFF' },
  outline: { background: Palette.surface, pressed: Palette.orangeSoft, border: Palette.line, text: Palette.ink },
  ghost: { background: 'transparent', pressed: Palette.track, border: 'transparent', text: Palette.inkSoft },
  danger: { background: Palette.danger, pressed: Palette.ink, border: Palette.danger, text: '#FFFFFF' },
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
    <Pressable
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: pressed && !blocked ? visual.pressed : visual.background,
          borderColor: visual.border,
        },
        blocked && styles.blocked,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={visual.text} />
      ) : icon ? (
        <AppIcon name={icon} size={20} color={visual.text} />
      ) : null}
      <Text style={[styles.label, { color: visual.text }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  blocked: {
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
  },
});
