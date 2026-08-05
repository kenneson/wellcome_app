export interface Dish {
    id: string;
    name: string;
    description: string;
    category: 'ENTRADA' | 'PRATO_PRINCIPAL' | 'SOBREMESA' | 'BEBIDA' | '';
}

export interface LocationDetails {
    address: string;
    city: string;
    state: string;
    neighborhood: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
    confirmed: boolean;
    facilities: string[];
    rules: string[];
}

export interface EventDetails {
    pricePerGuest: string;
    maxGuests: string;
    date: Date | null;
    endTime: Date | null;
    registrationDeadline: Date | null;
    title: string;
    description: string;
    coverImage: string | null;
    accessType: 'OPEN' | 'OPEN_WITH_APPROVAL' | 'PRIVATE' | 'INVITE_ONLY';
    questions: { question: string; questionType: 'TEXT' | 'SELECT' | 'MULTI_SELECT'; options?: string[]; required: boolean }[];
}

export interface EventCreationState {
    eventType: string;
    cuisineTypes: string[];
    vibe: string[];
    isServedInSequence: boolean;
    dishes: Dish[];
    location: LocationDetails;
    details: EventDetails;
    veganOptions: boolean;
    substitutions: boolean;
    menuAlterations: boolean;
}

export type EventCreationSaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';
