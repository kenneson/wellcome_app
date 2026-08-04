import React, { ComponentProps, ElementRef, forwardRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import {
  KeyboardAwareScrollView as BaseKeyboardAwareScrollView,
} from 'react-native-keyboard-aware-scroll-view';

type KeyboardAwareScrollViewProps = ComponentProps<typeof BaseKeyboardAwareScrollView>;

export const KeyboardAwareScrollView = forwardRef<
  ElementRef<typeof BaseKeyboardAwareScrollView>,
  KeyboardAwareScrollViewProps
>(function KeyboardAwareScrollView(
  {
    enableOnAndroid = true,
    enableAutomaticScroll = true,
    enableResetScrollToCoords = false,
    extraHeight = 80,
    extraScrollHeight = 24,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode,
    showsVerticalScrollIndicator = false,
    style,
    ...props
  },
  ref
) {
  return (
    <BaseKeyboardAwareScrollView
      ref={ref}
      {...props}
      style={[styles.container, style]}
      enableOnAndroid={enableOnAndroid}
      enableAutomaticScroll={enableAutomaticScroll}
      enableResetScrollToCoords={enableResetScrollToCoords}
      extraHeight={Math.min(extraHeight, 80)}
      extraScrollHeight={Math.min(extraScrollHeight, 24)}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode ?? (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
