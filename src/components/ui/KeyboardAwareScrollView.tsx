import React, { ComponentProps, ElementRef, forwardRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import {
  KeyboardAwareScrollView as BaseKeyboardAwareScrollView,
} from 'react-native-keyboard-aware-scroll-view';

type BaseProps = ComponentProps<typeof BaseKeyboardAwareScrollView>;

export interface KeyboardAwareScrollViewProps extends BaseProps {
  keyboardVerticalOffset?: number;
}

export const KeyboardAwareScrollView = forwardRef<
  ElementRef<typeof BaseKeyboardAwareScrollView>,
  KeyboardAwareScrollViewProps
>(function KeyboardAwareScrollView(
  {
    keyboardVerticalOffset = 0,
    enableOnAndroid = true,
    enableAutomaticScroll = true,
    enableResetScrollToCoords = false,
    extraHeight = 180,
    extraScrollHeight = 96,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode,
    showsVerticalScrollIndicator = false,
    style,
    ...props
  },
  ref
) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <BaseKeyboardAwareScrollView
        ref={ref}
        {...props}
        style={[styles.container, style]}
        enableOnAndroid={enableOnAndroid}
        enableAutomaticScroll={enableAutomaticScroll}
        enableResetScrollToCoords={enableResetScrollToCoords}
        extraHeight={Math.max(extraHeight, 180)}
        extraScrollHeight={Math.max(extraScrollHeight, 96)}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode ?? (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      />
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
