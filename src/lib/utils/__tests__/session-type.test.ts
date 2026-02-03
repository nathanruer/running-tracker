import { isFractionneType, isQualitySessionType } from '../session-type';

describe('isFractionneType', () => {
  it('should return false for null or undefined', () => {
    expect(isFractionneType(null)).toBe(false);
    expect(isFractionneType(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isFractionneType('')).toBe(false);
  });

  it('should return true for "Fractionné" with accent', () => {
    expect(isFractionneType('Fractionné')).toBe(true);
    expect(isFractionneType('fractionné')).toBe(true);
    expect(isFractionneType('FRACTIONNÉ')).toBe(true);
  });

  it('should return true for "Fractionne" without accent', () => {
    expect(isFractionneType('Fractionne')).toBe(true);
    expect(isFractionneType('fractionne')).toBe(true);
    expect(isFractionneType('FRACTIONNE')).toBe(true);
  });

  it('should handle whitespace', () => {
    expect(isFractionneType('  fractionné  ')).toBe(true);
    expect(isFractionneType('  fractionne  ')).toBe(true);
  });

  it('should return false for other session types', () => {
    expect(isFractionneType('Footing')).toBe(false);
    expect(isFractionneType('Sortie longue')).toBe(false);
    expect(isFractionneType('VMA')).toBe(false);
  });
});

describe('isQualitySessionType', () => {
  it('should return false for null or undefined', () => {
    expect(isQualitySessionType(null)).toBe(false);
    expect(isQualitySessionType(undefined)).toBe(false);
  });

  it('should return true for Fractionné types', () => {
    expect(isQualitySessionType('Fractionné')).toBe(true);
    expect(isQualitySessionType('fractionne')).toBe(true);
  });

  it('should return true for VMA', () => {
    expect(isQualitySessionType('VMA')).toBe(true);
    expect(isQualitySessionType('vma')).toBe(true);
  });

  it('should return true for Seuil', () => {
    expect(isQualitySessionType('Seuil')).toBe(true);
    expect(isQualitySessionType('seuil')).toBe(true);
  });

  it('should return true for Tempo', () => {
    expect(isQualitySessionType('Tempo')).toBe(true);
    expect(isQualitySessionType('tempo')).toBe(true);
  });

  it('should return false for endurance types', () => {
    expect(isQualitySessionType('Footing')).toBe(false);
    expect(isQualitySessionType('Sortie longue')).toBe(false);
    expect(isQualitySessionType('Récupération')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(isQualitySessionType('  vma  ')).toBe(true);
    expect(isQualitySessionType('  seuil  ')).toBe(true);
  });
});
