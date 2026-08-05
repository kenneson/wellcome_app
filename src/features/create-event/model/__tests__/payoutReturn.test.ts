import {
    EVENT_CREATION_RETURN_ROUTE,
    getEventCreationReturnPath,
} from '../payoutReturn';

describe('payout setup return route', () => {
    it('returns to the same cloud draft after Pix or KYC setup', () => {
        expect(getEventCreationReturnPath(EVENT_CREATION_RETURN_ROUTE, 'draft-123')).toBe(
            '/events/create/settings?draftId=draft-123',
        );
    });

    it('does not accept unrelated return destinations', () => {
        expect(getEventCreationReturnPath('/profile', 'draft-123')).toBeNull();
        expect(getEventCreationReturnPath(EVENT_CREATION_RETURN_ROUTE, '')).toBeNull();
    });
});
