import { AppIcon } from '@/components/ui/icon';
import { BorderRadius, Dimensions, Palette, Spacing } from '@/shared/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height the content sheet overlaps the orange header by. */
export const SHEET_OVERLAP = 28;

interface BrandHeaderProps {
  eyebrow?: string;
  title?: string;
  /** Custom content for the left side of the top row, in place of eyebrow/title. */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Orange brand header shared by the main tabs. Pair it with `BrandSheet`,
 * which rounds the top of the content and slides it over the header.
 */
export function BrandHeader({ eyebrow, title, leading, actions, children, style }: BrandHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.md }, style]}>
      {(eyebrow || title || leading || actions) && (
        <View style={styles.topRow}>
          <View style={styles.titleGroup}>
            {leading}
            {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
            {!!title && (
              <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>
          {!!actions && <View style={styles.actions}>{actions}</View>}
        </View>
      )}
      {children}
    </View>
  );
}

export function BrandSheet({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

interface BrandStackHeaderProps {
  title: string;
  eyebrow?: string;
  /** Overrides the default back navigation. */
  onBack?: () => void;
  /** Icon for the leading button; use "close" on modal screens. */
  backIcon?: 'chevron-back' | 'close';
  actions?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Compact brand header for screens pushed on top of the tabs: a back (or close)
 * button, then eyebrow and title. Pair it with `BrandSheet` like the tabs do.
 */
export function BrandStackHeader({ title, eyebrow, onBack, backIcon = 'chevron-back', actions, children, style }: BrandStackHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)')));

  return (
    <BrandHeader style={[styles.stackHeader, style]} actions={actions} leading={(
      <View style={styles.stackLeading}>
        <HeaderIconButton
          icon={backIcon}
          accessibilityLabel={backIcon === 'close' ? 'Fechar' : 'Voltar'}
          onPress={handleBack}
        />
        <View style={styles.stackTitles}>
          {!!eyebrow && <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>}
          <Text style={styles.stackTitle} accessibilityRole="header" numberOfLines={1}>{title}</Text>
        </View>
      </View>
    )}>
      {children}
    </BrandHeader>
  );
}

interface HeaderIconButtonProps {
  icon: string;
  accessibilityLabel: string;
  onPress: () => void;
  badge?: number;
}

/** Round translucent icon button for use on the orange header. */
export function HeaderIconButton({ icon, accessibilityLabel, onPress, badge = 0 }: HeaderIconButtonProps) {
  const badgeLabel = badge > 9 ? '9+' : String(badge);

  return (
    <TouchableOpacity
      style={styles.iconButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${accessibilityLabel}, ${badge} novas` : accessibilityLabel}
      hitSlop={6}
    >
      <AppIcon name={icon} size={22} color="#FFFFFF" />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Palette.orange,
    paddingHorizontal: Spacing.xl,
    paddingBottom: SHEET_OVERLAP + Spacing.xl,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: Palette.orangeOnBrand,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  stackHeader: {
    paddingBottom: SHEET_OVERLAP + Spacing.lg,
  },
  stackLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stackTitles: {
    flex: 1,
    gap: 2,
  },
  stackTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sheet: {
    flex: 1,
    marginTop: -SHEET_OVERLAP,
    backgroundColor: Palette.paper,
    borderTopLeftRadius: BorderRadius.sheet,
    borderTopRightRadius: BorderRadius.sheet,
    overflow: 'hidden',
  },
  iconButton: {
    width: Dimensions.touchTarget.min,
    height: Dimensions.touchTarget.min,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.onBrandGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Palette.ink,
    borderWidth: 2,
    borderColor: Palette.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
