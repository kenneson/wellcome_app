export class EventCreationError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly fieldErrors: Record<string, string> = {},
        public readonly statusCode: number = 422,
    ) {
        super(message);
        this.name = 'EventCreationError';
    }
}
