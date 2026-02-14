export interface EventDish {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    category: string; // ENTRADA, PRATO_PRINCIPAL, SOBREMESA, BEBIDA
    order: number;
    createdAt: Date;
}
