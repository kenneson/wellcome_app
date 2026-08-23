import { Box } from '@/shared/ui/box';
import { Text } from '@/shared/ui/text';
import React from 'react';

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
      <Box className="mb-2 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-xs font-bold uppercase tracking-wide text-typography-600">{label}</Text>
        {hint ? <Text className="text-xs text-typography-400">{hint}</Text> : null}
      </Box>
      <Box className={`overflow-hidden rounded-xl border bg-white ${error ? 'border-error-400' : 'border-outline-200'}`}>
        {children}
      </Box>
      {error ? (
        <Text className="mt-1.5 text-xs text-error-600" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </Box>
  );
}
