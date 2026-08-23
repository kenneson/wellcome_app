import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../domain/repositories/EventQuestionRepository';
import { Event, UpdateEventDTO } from '../../domain/entities/Event';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice } from '../../domain/constants/payments';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { EventCreationError } from '../errors/EventCreationError';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';

const CONTRACT_FIELDS_LOCKED_AFTER_SALE: Array<keyof UpdateEventDTO> = [
    'price',
    'maxGuests',
    'eventDate',
    'endTime',
    'reservationDeadline',
    'location',
    'city',
    'state',
    'latitude',
    'longitude',
    'accessType',
    'requiresApproval',
    'allowWaitlist',
    'autoApproveIfAttended',
    'autoApproveMinRating',
    'rules',
    'dietaryOptions',
    'isServedInSequence',
    'questions',
    'dishes',
];

export class UpdateEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventQuestionRepository: EventQuestionRepository,
        private userRepository?: UserRepository,
    ) { }

    async execute(eventId: string, hostId: string, data: UpdateEventDTO): Promise<Event> {
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.hostId !== hostId) {
            throw new Error('Only the host can update this event');
        }

        const hasSaleHistory = (event.bookings ?? []).some((booking) => [
            PaymentStatus.CONFIRMED,
            PaymentStatus.PARTIALLY_REFUNDED,
            PaymentStatus.REFUNDED,
            PaymentStatus.CHARGEBACK,
        ].includes(booking.paymentStatus as PaymentStatus));

        if (hasSaleHistory) {
            const lockedChanges = CONTRACT_FIELDS_LOCKED_AFTER_SALE.filter((field) =>
                data[field] !== undefined && !this.valuesEqual(data[field], (event as any)[field])
            );
            if (lockedChanges.length > 0) {
                const fieldErrors = Object.fromEntries(lockedChanges.map((field) => [
                    field,
                    'Este campo nao pode ser alterado depois da primeira venda',
                ]));
                throw new EventCreationError(
                    'EVENT_CONTRACT_LOCKED_AFTER_SALE',
                    'Preco, vagas, data, local e regras de inscricao ficam protegidos depois da primeira venda',
                    fieldErrors,
                    409
                );
            }
        }

        if (data.price !== undefined && !isValidEventPrice(Number(data.price))) {
            throw new Error(INVALID_EVENT_PRICE_MESSAGE);
        }

        const fieldErrors: Record<string, string> = {};
        const scheduleChanged = data.eventDate !== undefined
            || data.endTime !== undefined
            || data.reservationDeadline !== undefined;
        if (scheduleChanged) {
            const now = Date.now();
            const start = data.eventDate ?? event.eventDate;
            const end = data.endTime === undefined ? event.endTime : data.endTime;
            const deadline = data.reservationDeadline === undefined
                ? event.reservationDeadline
                : data.reservationDeadline;
            if (start.getTime() <= now) fieldErrors.eventDate = 'A data do evento deve estar no futuro';
            if (!end || end.getTime() <= start.getTime()) fieldErrors.endTime = 'O termino deve ser posterior ao inicio';
            if (deadline && (deadline.getTime() <= now || deadline.getTime() >= start.getTime())) {
                fieldErrors.reservationDeadline = 'O prazo deve estar entre agora e o inicio do evento';
            }
        }

        if (data.location !== undefined) {
            if (data.city === undefined) fieldErrors.city = 'Confirme a cidade do novo endereco';
            if (data.state === undefined) fieldErrors.state = 'Confirme o estado do novo endereco';
            if (data.latitude === undefined || data.longitude === undefined) {
                fieldErrors.coordinates = 'Confirme o novo endereco no mapa';
            }
        }
        if ((data.latitude === undefined) !== (data.longitude === undefined)) {
            fieldErrors.coordinates = 'Informe latitude e longitude juntas';
        }
        if (Object.keys(fieldErrors).length > 0) {
            throw new EventCreationError('INVALID_EVENT', 'Revise os dados do evento', fieldErrors);
        }

        if (data.price !== undefined && Number(data.price) > 0 && this.userRepository) {
            const host = await this.userRepository.findById(hostId);
            const payoutErrors: Record<string, string> = {};
            if (host?.kycStatus !== 'APPROVED') payoutErrors.kyc = 'Conclua a verificacao de identidade';
            if (!host?.pixKey || !host.pixKeyType) payoutErrors.pixKey = 'Cadastre uma chave Pix';
            if (Object.keys(payoutErrors).length > 0) {
                throw new EventCreationError(
                    'HOST_PAYOUT_SETUP_REQUIRED',
                    'Configure o recebimento antes de tornar este evento pago',
                    payoutErrors,
                );
            }
        }

        return this.eventRepository.update(eventId, data);
    }

    private valuesEqual(left: unknown, right: unknown): boolean {
        if (left instanceof Date || right instanceof Date) {
            if (left === null || right === null) return left === right;
            return new Date(left as any).getTime() === new Date(right as any).getTime();
        }
        if (typeof left === 'number' || typeof right === 'number') {
            return Number(left) === Number(right);
        }
        if (Array.isArray(left) || Array.isArray(right)) {
            return JSON.stringify(this.normalizeArray(left)) === JSON.stringify(this.normalizeArray(right));
        }
        return left === right;
    }

    private normalizeArray(value: unknown): unknown[] {
        if (!Array.isArray(value)) return [];
        return value.map((item) => {
            if (!item || typeof item !== 'object') return item;
            const record = item as Record<string, unknown>;
            return Object.fromEntries(
                Object.entries(record)
                    .filter(([key, entry]) => !['id', 'eventId', 'createdAt', 'order'].includes(key) && entry !== undefined)
                    .sort(([left], [right]) => left.localeCompare(right))
            );
        });
    }
}
