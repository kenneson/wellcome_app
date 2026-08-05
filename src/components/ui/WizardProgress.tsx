import React from 'react';
import { View, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface WizardProgressProps { currentStep: number; }

const steps = [
    { label: 'Evento', icon: 'calendar' },
    { label: 'Cardápio', icon: 'list.bullet' },
    { label: 'Local', icon: 'mappin.and.ellipse' },
    { label: 'Data', icon: 'info.circle' },
    { label: 'Revisão', icon: 'checkmark.circle' },
];

export function getWizardProgressPercentage(currentStep: number) {
    const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1));
    return (safeStep / (steps.length - 1)) * 100;
}

export function WizardProgress({ currentStep }: WizardProgressProps) {
    const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1));
    return (
        <View className="px-1 py-3 bg-white" accessibilityLabel={`Etapa ${safeStep + 1} de ${steps.length}`}>
            <Text className="text-xs text-gray-500 font-semibold mb-3">Etapa {safeStep + 1} de {steps.length}</Text>
            <View className="flex-row items-center justify-between relative">
                {/* Background Line */}
                <View className="absolute top-3 left-0 right-0 h-[2px] bg-gray-200 z-0" />

                {/* Active Line Progress */}
                <View
                    className="absolute top-3 left-0 h-[2px] bg-[#FF8C42] z-0"
                    style={{ width: `${getWizardProgressPercentage(safeStep)}%` }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index < safeStep;
                    const isCurrent = index === safeStep;

                    return (
                        <View key={index} className="items-center z-10 flex-1">
                            <View
                                className={`w-6 h-6 rounded-full items-center justify-center border-2 mb-1 bg-white ${isCompleted
                                        ? 'bg-[#FF8C42] border-[#FF8C42]'
                                        : isCurrent
                                            ? 'border-[#FF8C42]'
                                            : 'border-gray-200'
                                    }`}
                            >
                                {isCompleted ? (
                                    <IconSymbol name="checkmark" size={14} color="#FFF" />
                                ) : isCurrent ? (
                                    <View className="w-2.5 h-2.5 rounded-full bg-[#FF8C42]" />
                                ) : null}
                            </View>
                            <Text className={`text-[10px] font-medium ${isCurrent || isCompleted ? 'text-[#1A1A1A]' : 'text-gray-400'}`}>
                                {step.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
