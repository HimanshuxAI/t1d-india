// Bolus Calculator Unit Tests

import { describe, it, expect } from 'vitest';
import { calculateBolus } from '../../utils/bolus-calculator';

describe('Bolus Calculator', () => {
  const standardProfile = {
    icr: 10.0,
    isf: 50.0,
    target: 110,
    regimen: 'BASAL_BOLUS' as const,
  };

  describe('Basic meal bolus', () => {
    it('should calculate meal bolus = carbs / ICR', () => {
      const result = calculateBolus({
        carbsG: 60,
        currentGlucose: 120,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      expect(result.mealBolusU).toBe(6.0);
      expect(result.correctionBolusU).toBe(0.0);
      expect(result.totalBolusU).toBe(6.0);
    });

    it('should calculate correction bolus when glucose above target', () => {
      const result = calculateBolus({
        carbsG: 0,
        currentGlucose: 210,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      expect(result.correctionBolusU).toBe(2.0); // (210-110)/50
      expect(result.totalBolusU).toBe(2.0);
    });

    it('should not give correction when glucose at target', () => {
      const result = calculateBolus({
        carbsG: 0,
        currentGlucose: 110,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      expect(result.correctionBolusU).toBe(0);
    });

    it('should not give correction below minimum threshold', () => {
      const result = calculateBolus({
        carbsG: 0,
        currentGlucose: 85,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      expect(result.correctionBolusU).toBe(0);
    });
  });

  describe('IOB adjustment', () => {
    it('should reduce bolus when IOB is high', () => {
      const result = calculateBolus({
        carbsG: 60,
        currentGlucose: 120,
        iobRapid: 4.0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      // IOB adjustment = (4.0 - 3.0) * 0.5 = 0.5U
      expect(result.totalBolusU).toBe(5.5);
      expect(result.warnings.some(w => w.includes('High IOB'))).toBe(true);
    });

    it('should not adjust when IOB below threshold', () => {
      const result = calculateBolus({
        carbsG: 60,
        currentGlucose: 120,
        iobRapid: 2.0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      expect(result.totalBolusU).toBe(6.0);
      expect(result.warnings.some(w => w.includes('High IOB'))).toBe(false);
    });

    it('should weight NPH and Regular IOB lower than rapid', () => {
      const result = calculateBolus({
        carbsG: 60,
        currentGlucose: 120,
        iobRapid: 0,
        iobRegular: 4.0,
        iobNph: 4.0,
        ...standardProfile,
      });

      // totalIob = 0 + 4*0.5 + 4*0.3 = 2 + 1.2 = 3.2
      // adjustment = (3.2 - 3.0) * 0.5 = 0.1
      expect(result.totalBolusU).toBeCloseTo(5.9, 1);
    });
  });

  describe('NPH/Regular regimen adjustments', () => {
    it('should reduce bolus during NPH peak (4-8 hours)', () => {
      const result = calculateBolus({
        carbsG: 60,
        currentGlucose: 120,
        iobRapid: 0,
        iobRegular: 1.0,
        iobNph: 8.0,
        ...standardProfile,
        regimen: 'NPH_REGULAR',
        timeSinceLastMealMin: 300, // 5 hours
      });

      expect(result.totalBolusU).toBeLessThan(6.0);
      expect(result.warnings.some(w => w.includes('NPH may be peaking'))).toBe(true);
    });

    it('should reduce correction for premixed during NPH activity', () => {
      const result = calculateBolus({
        carbsG: 0,
        currentGlucose: 200,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 6.0,
        ...standardProfile,
        regimen: 'PREMIXED_30_70',
        timeSinceLastMealMin: 240, // 4 hours
      });

      expect(result.warnings.some(w => w.includes('Premixed NPH component active'))).toBe(true);
    });
  });

  describe('Safety caps', () => {
    it('should cap at maximum bolus', () => {
      const result = calculateBolus({
        carbsG: 200,
        currentGlucose: 300,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      expect(result.totalBolusU).toBe(15.0);
      expect(result.warnings.some(w => w.includes('exceeds max'))).toBe(true);
    });

    it('should prevent predicted glucose below floor', () => {
      const result = calculateBolus({
        carbsG: 0,
        currentGlucose: 90,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 0,
        icr: 10.0,
        isf: 50.0,
        target: 110,
        regimen: 'BASAL_BOLUS',
        recentHypo: false,
      });

      // Max safe bolus = (90-80)/50 = 0.2U
      expect(result.totalBolusU).toBeLessThanOrEqual(0.2);
      expect(result.warnings.some(w => w.includes('Predicted glucose may drop'))).toBe(true);
    });
  });

  describe('Recent hypoglycemia warning', () => {
    it('should warn about recent hypo', () => {
      const result = calculateBolus({
        carbsG: 60,
        currentGlucose: 120,
        iobRapid: 0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
        recentHypo: true,
      });

      expect(result.warnings.some(w => w.includes('Recent hypoglycemia'))).toBe(true);
    });
  });

  describe('Explanation generation', () => {
    it('should generate human-readable explanation', () => {
      const result = calculateBolus({
        carbsG: 60,
        currentGlucose: 160,
        iobRapid: 1.0,
        iobRegular: 0,
        iobNph: 0,
        ...standardProfile,
      });

      expect(result.explanation).toContain('Meal bolus: 6.0U');
      expect(result.explanation).toContain('Correction: 1.0U');
      expect(result.explanation).toContain('IOB adjustment');
    });
  });
});