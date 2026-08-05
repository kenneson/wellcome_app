import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventQuestionRepository } from '../../domain/repositories/EventQuestionRepository';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { CreateEventDTO, Event } from '../../domain/entities/Event';
import { QuestionType } from '../../domain/value-objects/QuestionType';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice } from '../../domain/constants/payments';
import { EventCreationError } from '../errors/EventCreationError';

export class CreateEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventQuestionRepository: EventQuestionRepository,
        private userRepository: UserRepository
    ) { }

    async execute(data: CreateEventDTO): Promise<Event> {
        if (data.creationKey && this.eventRepository.findByCreationKey) {
            const existingEvent = await this.eventRepository.findByCreationKey(data.creationKey);
            if (existingEvent) return existingEvent;
        }

        if (data.maxGuests < 1) {
            throw new EventCreationError('INVALID_EVENT', 'Revise os dados do evento', {
                maxGuests: 'O evento deve aceitar pelo menos uma pessoa',
            });
        }

        if (!isValidEventPrice(Number(data.price))) {
            throw new EventCreationError('INVALID_EVENT_PRICE', INVALID_EVENT_PRICE_MESSAGE, {
                price: INVALID_EVENT_PRICE_MESSAGE,
            });
        }

        // Validate host exists
        const host = await this.userRepository.findById(data.hostId);
        if (!host) {
            throw new EventCreationError('HOST_NOT_FOUND', 'Perfil do anfitrião não encontrado', {}, 404);
        }

        if (Number(data.price) > 0) {
            const fieldErrors: Record<string, string> = {};
            if (host.kycStatus !== 'APPROVED') {
                fieldErrors.kyc = 'Conclua a verificação de identidade antes de publicar um evento pago';
            }
            if (!host.pixKey || !host.pixKeyType) {
                fieldErrors.pixKey = 'Cadastre uma chave Pix para receber pelos seus eventos';
            }
            if (Object.keys(fieldErrors).length > 0) {
                throw new EventCreationError(
                    'HOST_PAYOUT_SETUP_REQUIRED',
                    'Configure o recebimento antes de publicar este evento',
                    fieldErrors,
                );
            }
        }

        try {
            return await this.eventRepository.create(data);
        } catch (error: any) {
            if (data.creationKey && error?.code === 'P2002' && this.eventRepository.findByCreationKey) {
                const existingEvent = await this.eventRepository.findByCreationKey(data.creationKey);
                if (existingEvent) return existingEvent;
            }
            throw error;
        }
    }
}
