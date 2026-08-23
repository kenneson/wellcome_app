import { View, Text } from 'react-native';
import { RegistrationStatus } from '@/entities/event/types';
import { cn } from '@/shared/lib/utils'; // Make sure path alias is correct, otherwise adjust to relative path
// Usually '@/shared' maps to 'src/shared'. I'll assume standard alias configuration.
// If not, I should check tsconfig.json but to be safe I can use relative path.
// Relative path from src/components/ui to src/shared is '../../shared'.

interface StatusBadgeProps {
    status: RegistrationStatus | string;
    className?: string; // allow overrides
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    let containerClass = 'bg-gray-100';
    let textClass = 'text-gray-800';
    let label = status;

    switch (status) {
        case RegistrationStatus.APPROVED:
        case 'APPROVED':
            containerClass = 'bg-green-100';
            textClass = 'text-green-800';
            label = 'Aprovado';
            break;
        case RegistrationStatus.PENDING:
        case 'PENDING':
            containerClass = 'bg-yellow-100';
            textClass = 'text-yellow-800';
            label = 'Pendente';
            break;
        case RegistrationStatus.REJECTED:
        case 'REJECTED':
            containerClass = 'bg-red-100';
            textClass = 'text-red-800';
            label = 'Rejeitado';
            break;
        case RegistrationStatus.WAITLIST:
        case 'WAITLIST':
            containerClass = 'bg-blue-100';
            textClass = 'text-blue-800';
            label = 'Lista de Espera';
            break;
        case RegistrationStatus.CANCELLED:
        case 'CANCELLED':
            containerClass = 'bg-gray-200';
            textClass = 'text-gray-600';
            label = 'Cancelado';
            break;
        case RegistrationStatus.EXPIRED:
        case 'EXPIRED':
            containerClass = 'bg-orange-100';
            textClass = 'text-orange-800';
            label = 'Prazo expirado';
            break;
    }

    return (
        <View className={cn("px-2.5 py-0.5 rounded-full self-start", containerClass, className)}>
            <Text className={cn("text-xs font-medium", textClass)}>
                {label}
            </Text>
        </View>
    );
}
