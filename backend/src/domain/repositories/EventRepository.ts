import { CreateEventDTO, UpdateEventDTO, Event } from '../entities/Event';

export interface EventFilters {
    latitude?: number;
    longitude?: number;
    radiusInKm?: number;
    city?: string;
    cuisine?: string[];
    vibe?: string[];
    priceMin?: number;
    priceMax?: number;
    eventType?: string;
    excludeHostId?: string;
}

export interface HostCancellationResult {
    refundPaymentIds: string[];
    pendingPayments: { id: string; txid: string; providerPaymentId?: string; checkoutUrl?: string }[];
    notifyUsers: { id: string; expoPushToken: string | null }[];
    feeTotal: number;
}

export interface EventRepository {
    /** Atomically cancels the event and its active bookings, queues full refunds and debits the host fee. */
    cancelByHost?(eventId: string, hostId: string, reason: string): Promise<HostCancellationResult>;
    create(data: CreateEventDTO): Promise<Event>;
    findAll(filters?: EventFilters): Promise<Event[]>;
    findById(id: string): Promise<Event | null>;
    findByCreationKey?(creationKey: string): Promise<Event | null>;
    update(id: string, data: UpdateEventDTO): Promise<Event>;
    delete(id: string): Promise<void>;
}
