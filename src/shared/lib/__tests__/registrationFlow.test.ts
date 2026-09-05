import { canPayRegistration, registrationFlow } from '../registrationFlow';

describe('registration flow shown to guests and hosts', () => {
    it('allows payment before approval', () => {
        expect(canPayRegistration({ status: 'PENDING', paymentStatus: 'PENDING' })).toBe(true);
        expect(registrationFlow({ status: 'PENDING' }, true, true).label).toBe('Aguardando pagamento');
    });
    it('reserves a paid candidate without issuing the final ticket', () => {
        const flow = registrationFlow({ status: 'PENDING', paymentStatus: 'CONFIRMED' }, true, true);
        expect(flow.label).toBe('Pago · aguardando aprovação');
        expect(flow.description).toContain('Vaga reservada');
    });
    it('confirms only after payment and approval', () => {
        expect(registrationFlow({ status: 'APPROVED', paymentStatus: 'CONFIRMED' }, true, true).label).toBe('Participação confirmada');
        expect(registrationFlow({ status: 'APPROVED' }, true, true).label).toBe('Aguardando pagamento');
    });
    it('distinguishes refund pending from refund completed', () => {
        expect(registrationFlow({ status: 'REJECTED', paymentStatus: 'CONFIRMED' }, true, true).label).toContain('estorno em processamento');
        expect(registrationFlow({ status: 'REJECTED', paymentStatus: 'REFUNDED' }, true, true).label).toBe('Estorno concluído');
    });
    it.each(['REJECTED', 'CANCELLED', 'EXPIRED', 'WAITLIST'])('never offers payment for %s', (status) => {
        expect(canPayRegistration({ status })).toBe(false);
    });
    it('does not charge again after refund or payment confirmation', () => {
        expect(canPayRegistration({ status: 'APPROVED', paymentStatus: 'REFUNDED' })).toBe(false);
        expect(canPayRegistration({ status: 'PENDING', paymentStatus: 'CONFIRMED' })).toBe(false);
    });
});
