type Booking = { status?: string | null; paymentStatus?: string | null; paymentProviderStatus?: string | null; paymentDueAt?: string | null };
export const hasConfirmedPayment = (booking: Booking) =>
    booking.paymentStatus === 'CONFIRMED' || booking.paymentStatus === 'PARTIALLY_REFUNDED';

export function canPayRegistration(booking: Booking, now = Date.now()) {
    return ['PENDING', 'APPROVED'].includes(booking.status || '')
        && !hasConfirmedPayment(booking)
        && !['REFUNDED', 'CHARGEBACK'].includes(booking.paymentStatus || '')
        && !(booking.paymentDueAt && new Date(booking.paymentDueAt).getTime() <= now);
}

export function registrationFlow(booking: Booking, paidEvent: boolean, requiresApproval: boolean) {
    const paid = hasConfirmedPayment(booking);
    if (booking.paymentStatus === 'REFUNDED') {
        return { label: 'Estorno concluído', description: 'O valor pago foi devolvido integralmente pelo meio de pagamento. A inscrição está encerrada.' };
    }
    if (booking.paymentStatus === 'CHARGEBACK') {
        return { label: 'Pagamento contestado', description: 'A participação está suspensa por contestação do pagamento.' };
    }
    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(booking.status || '')) {
        const title = booking.status === 'REJECTED' ? 'Inscrição recusada' : booking.status === 'EXPIRED' ? 'Inscrição expirada' : 'Inscrição cancelada';
        return {
            label: paid ? title + ' · estorno em processamento' : title,
            description: paid
                ? 'A vaga foi liberada. A devolução integral está em processamento; o prazo depende do meio de pagamento.'
                : 'Esta inscrição está encerrada e não reserva vaga.',
        };
    }
    if (booking.status === 'WAITLIST') {
        return { label: 'Lista de espera', description: 'Ainda não há vaga. Avisaremos quando for possível continuar a inscrição. Não pague agora.' };
    }
    if (booking.status === 'APPROVED' && (!paidEvent || paid)) {
        return { label: 'Participação confirmada', description: paidEvent ? 'Pagamento e aprovação concluídos. O ingresso está disponível.' : 'Inscrição aprovada. O ingresso está disponível.' };
    }
    if (paidEvent && !paid) {
        const expired = booking.paymentDueAt && new Date(booking.paymentDueAt).getTime() <= Date.now();
        return {
            label: expired ? 'Prazo de pagamento encerrado' : 'Aguardando pagamento',
            description: expired ? 'O prazo desta inscrição terminou.'
                : requiresApproval
                    ? 'Pague para reservar a vaga e enviar a inscrição para aprovação. Se o anfitrião recusar, o valor será devolvido integralmente.'
                    : 'Conclua o pagamento para confirmar a participação.',
        };
    }
    return {
        label: paid ? 'Pago · aguardando aprovação' : 'Aguardando aprovação',
        description: paid
            ? 'Vaga reservada. A participação depende da aprovação do anfitrião. Em caso de recusa, haverá estorno integral.'
            : 'O anfitrião precisa aprovar a participação.',
    };
}
