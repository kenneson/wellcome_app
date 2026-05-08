import React from 'react';
import { View, Text } from 'react-native';
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
        <View className="px-5 py-4 bg-white">
            <View className="flex-row items-center justify-between relative">
                {/* Background Line */}
                <View className="absolute top-3 left-0 right-0 h-[2px] bg-gray-200 z-0" />

                {/* Active Line Progress */}
                <View
                    className="absolute top-3 left-0 h-[2px] bg-[#FF8C42] z-0"
                    style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;

                    return (
                        <View key={index} className="items-center z-10 w-16">
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
                            <Text className={`text-[10px] font-medium ${isCurrent || isCompleted ? 'text-[#333333]' : 'text-gray-400'}`}>
                                {step.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
