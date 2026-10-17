import { Box } from '@/shared/ui/box';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WellcomeFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function WellcomeField({ label, error, hint, children, className = '' }: WellcomeFieldProps) {
  return (
    <Box className={`mb-4 ${className}`}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.control, error ? styles.controlError : null]}>
        {children}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </Box>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Palette.inkSoft,
  },
  hint: {
    fontSize: 12,
    color: Palette.muted,
  },
  control: {
    minHeight: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  controlError: {
    borderColor: Palette.danger,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: Palette.danger,
  },
});
