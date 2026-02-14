import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/ui/themed-text';
import { Accordion } from '@/shared/ui/molecules/accordion';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  return (
    <Accordion type="single" spacing={8}>
      <Accordion.Item value="item-1">
        <Accordion.Trigger>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
        </Accordion.Trigger>
        <Accordion.Content>
          <View style={{ paddingTop: 8 }}>
            {children}
          </View>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
