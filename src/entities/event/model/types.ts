export interface Dish {
    id: string;
    name: string;
    description: string;
}

export interface LocationDetails {
    address: string;
    latitude: number | null;
    longitude: number | null;
    facilities: string[];
    rules: string[];
}

export interface EventDetails {
    pricePerGuest: string;
    maxGuests: string;
    date: Date | null;
    registrationDeadline: Date | null;
    title: string;
    description: string;
    coverImage: string | null;
}

export interface EventCreationState {
    eventType: string;
    cuisineTypes: string[];
    isServedInSequence: boolean;
    dishes: Dish[];
    location: LocationDetails;
    details: EventDetails;
    veganOptions: boolean;
    substitutions: boolean;
    menuAlterations: boolean;
}
