import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../domain/repositories/EventQuestionRepository';
import { Event, UpdateEventDTO } from '../../domain/entities/Event';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice } from '../../domain/constants/payments';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { EventCreationError } from '../errors/EventCreationError';

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
}
