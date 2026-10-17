import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';

interface WizardProgressProps { currentStep: number; }

const steps = [
    { label: 'Evento', icon: 'calendar' },
    { label: 'Cardápio', icon: 'list.bullet' },
    { label: 'Local', icon: 'mappin.and.ellipse' },
    { label: 'Data', icon: 'info.circle' },
    { label: 'Revisão', icon: 'checkmark.circle' },
];

const DOT_SIZE = 24;

export function getWizardProgressPercentage(currentStep: number) {
    const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1));
    return (safeStep / (steps.length - 1)) * 100;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
    const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1));
    return (
        <View style={styles.container} accessibilityLabel={`Etapa ${safeStep + 1} de ${steps.length}`}>
            <View style={styles.headerRow}>
                <Text style={styles.stepLabel}>ETAPA {safeStep + 1} DE {steps.length}</Text>
                <Text style={styles.currentLabel}>{steps[safeStep].label}</Text>
            </View>
            <View style={styles.stepsRow}>
                {/* Track spans from the center of the first dot to the center of the last one. */}
                <View style={styles.trackArea} pointerEvents="none">
                    <View style={styles.track} />
                    <View style={[styles.trackFill, { width: `${getWizardProgressPercentage(safeStep)}%` }]} />
                </View>

                {steps.map((step, index) => {
                    const isCompleted = index < safeStep;
                    const isCurrent = index === safeStep;

                    return (
                        <View key={step.label} style={styles.step}>
                            <View
                                style={[
                                    styles.dot,
                                    isCompleted && styles.dotCompleted,
                                    isCurrent && styles.dotCurrent,
                                ]}
                            >
                                {isCompleted ? (
                                    <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                                ) : isCurrent ? (
                                    <View style={styles.dotInner} />
                                ) : null}
                            </View>
                            <Text style={[styles.label, (isCurrent || isCompleted) && styles.labelActive]}>
                                {step.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        paddingHorizontal: Spacing.sm,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.sm,
        marginBottom: Spacing.md,
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: Palette.orangeDeep,
    },
    currentLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: Palette.ink,
    },
    stepsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    trackArea: {
        position: 'absolute',
        top: DOT_SIZE / 2 - 1,
        left: '10%',
        right: '10%',
        height: 2,
    },
    track: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.track,
    },
    trackFill: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orange,
    },
    step: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        borderWidth: 2,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotCompleted: {
        backgroundColor: Palette.orange,
        borderColor: Palette.orange,
    },
    dotCurrent: {
        borderColor: Palette.orange,
    },
    dotInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Palette.orange,
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: Palette.muted,
    },
    labelActive: {
        fontWeight: '800',
        color: Palette.ink,
    },
});
