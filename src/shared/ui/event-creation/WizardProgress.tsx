import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface WizardProgressProps {
    currentStep: number; // 0 to 3
}

const steps = [
    { label: 'Evento', icon: 'calendar' },
    { label: 'Cardápio', icon: 'list.bullet' },
    { label: 'Local', icon: 'mappin.and.ellipse' },
    { label: 'Detalhes', icon: 'info.circle' },
];

export function WizardProgress({ currentStep }: WizardProgressProps) {
    return (
        <View style={styles.container}>
            <View style={styles.stepsContainer}>
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <React.Fragment key={index}>
                            {/* Line Connector */}
                            {index > 0 && (
                                <View style={[
                                    styles.connector,
                                    { backgroundColor: index <= currentStep ? '#FF8C42' : '#E0E0E0' }
                                ]} />
                            )}

                            <View style={styles.stepItem}>
                                <View style={[
                                    styles.circle,
                                    isCompleted ? styles.circleCompleted : (isCurrent ? styles.circleCurrent : styles.circlePending)
                                ]}>
                                    {isCompleted ? (
                                        <IconSymbol name="checkmark" size={12} color="#FFF" />
                                    ) : (
                                        <View style={[
                                            styles.innerCircle,
                                            { backgroundColor: isCurrent ? '#FF8C42' : 'transparent' }
                                        ]} />
                                    )}
                                </View>
                                <Text style={[
                                    styles.label,
                                    { color: isCurrent || isCompleted ? '#000' : '#999' }
                                ]}>
                                    {step.label}
                                </Text>
                            </View>
                        </React.Fragment>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
    },
    stepsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stepItem: {
        alignItems: 'center',
        zIndex: 1,
    },
    connector: {
        flex: 1,
        height: 2,
        position: 'relative',
        top: -10, // Adjust based on layout
        zIndex: 0,
        marginHorizontal: -10, // Pull connectors under circles
    },
    circle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginBottom: 4,
        backgroundColor: '#fff',
    },
    circleCompleted: {
        borderColor: '#FF8C42',
        backgroundColor: '#FF8C42',
    },
    circleCurrent: {
        borderColor: '#FF8C42',
    },
    circlePending: {
        borderColor: '#E0E0E0',
    },
    innerCircle: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
    },
});
