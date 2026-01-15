import { describe, it, expect } from 'vitest';
import { validateIntervalData } from '../validation';
import { type IntervalFormValues } from '../form';

describe('validateIntervalData', () => {
    it('should return empty array if session type is not Fractionné', () => {
      const values: IntervalFormValues = {
        sessionType: 'Endurance',
        repetitionCount: -5,
      };
      expect(validateIntervalData(values)).toEqual([]);
    });

    it('should validate repetition count', () => {
      const values: IntervalFormValues = { sessionType: 'Fractionné', repetitionCount: -3 };
      expect(validateIntervalData(values)).toContain('Le nombre de répétitions doit être supérieur à 0');
    });

    it('should validate effort duration', () => {
      expect(validateIntervalData({ sessionType: 'Fractionné', effortDuration: '5:00' })).not.toContain('La durée d\'effort est invalide');
      expect(validateIntervalData({ sessionType: 'Fractionné', effortDuration: '99:99' })).toContain('La durée d\'effort est invalide');
    });

    it('should validate recovery duration', () => {
        const values: IntervalFormValues = { sessionType: 'Fractionné', recoveryDuration: 'invalid' };
        expect(validateIntervalData(values)).toContain('La durée de récupération est invalide');
    });

    it('should validate pace format', () => {
        expect(validateIntervalData({ sessionType: 'Fractionné', targetEffortPace: '4:30' })).not.toContain('L\'allure d\'effort est invalide');
        expect(validateIntervalData({ sessionType: 'Fractionné', targetEffortPace: '99:99' })).toContain('L\'allure d\'effort est invalide');
    });

    it('should validate recovery pace', () => {
        expect(validateIntervalData({ sessionType: 'Fractionné', targetRecoveryPace: 'abc' })).toContain('L\'allure de récupération est invalide');
    });

    it('should return no errors for valid data', () => {
        const values: IntervalFormValues = {
          sessionType: 'Fractionné',
          repetitionCount: 10,
          effortDuration: '5:00',
          recoveryDuration: '2:30',
          targetEffortPace: '4:30',
          targetRecoveryPace: '6:00',
        };
        expect(validateIntervalData(values)).toEqual([]);
    });
});
