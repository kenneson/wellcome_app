import { getWizardProgressPercentage } from '../WizardProgress';

describe('WizardProgress', () => {
    it('maps the five steps from zero to one hundred percent', () => {
        expect(getWizardProgressPercentage(0)).toBe(0);
        expect(getWizardProgressPercentage(2)).toBe(50);
        expect(getWizardProgressPercentage(4)).toBe(100);
    });

    it('clamps invalid steps instead of overflowing the track', () => {
        expect(getWizardProgressPercentage(-1)).toBe(0);
        expect(getWizardProgressPercentage(8)).toBe(100);
    });
});
