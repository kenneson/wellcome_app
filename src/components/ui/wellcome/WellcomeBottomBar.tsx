import { Box } from '@/shared/ui/box';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function WellcomeBottomBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;

  return (
    <Box
      className="absolute bottom-0 left-0 right-0 border-t border-outline-100 bg-white pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: horizontalPadding }}
    >
      {children}
    </Box>
  );
}
