import { Elevation, Palette, Spacing } from '@/shared/constants/theme';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function WellcomeBottomBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: horizontalPadding }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.md,
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.lineSoft,
    ...Elevation.floating,
  },
});
