import { describe, it, expect } from 'vitest';
import { parseGarminCSV } from '../garmin-csv';

describe('parseGarminCSV', () => {
  it('should return null for empty or invalid CSV', () => {
    expect(parseGarminCSV('')).toBeNull();
    expect(parseGarminCSV('header only')).toBeNull();
  });

  it('should parse valid CSV correctly', () => {
    const csv = `
"Activités","Favoris","Type d'étape","Durée","Distance","Allure moyenne","Fréquence cardiaque moyenne"
"2","False","Course","10:00","1.48","06:45","152"
"2","False","Course","08:00","1.56","05:07","175"
"2","False","Course","08:00","1.58","05:07","178"
    `.trim();

    const result = parseGarminCSV(csv);

    expect(result).not.toBeNull();
    expect(result?.steps).toHaveLength(3);
    expect(result?.repetitionCount).toBe(3);
    expect(result?.effortDuration).toBe('08:00');
  });

  it('should identify different step types correctly', () => {
    const csv = `
"Type d'étape","Durée","Distance"
"Échauffement","10:00","1.5"
"Course","05:00","1.0"
"Récupération","02:00","0.2"
"Retour au calme","10:00","1.0"
    `.trim();

    const result = parseGarminCSV(csv);
    
    expect(result?.steps).toHaveLength(4);
    expect(result?.steps[0].stepType).toBe('warmup');
    expect(result?.steps[1].stepType).toBe('effort');
    expect(result?.steps[2].stepType).toBe('recovery');
    expect(result?.steps[3].stepType).toBe('cooldown');
  });

  it('should format duration correctly', () => {
    const csv = `
"Type d'étape","Durée"
"Course","10:30"
"Course","5:05"
"Course","--"
    `.trim();

    const result = parseGarminCSV(csv);
    
    expect(result?.steps[0].duration).toBe('10:30');
    expect(result?.steps[1].duration).toBe('05:05');
    expect(result?.steps[2].duration).toBeNull();
  });

  it('should handle numeric values correctly', () => {
    const csv = `
"Type d'étape","Durée","Distance","Fréquence cardiaque moyenne"
"Course","10:00","2.5","160"
"Course","10:00","--","--"
    `.trim();

    const result = parseGarminCSV(csv);
    
    expect(result?.steps[0].distance).toBe(2.5);
    expect(result?.steps[0].hr).toBe(160);
    expect(result?.steps[1].distance).toBeNull();
    expect(result?.steps[1].hr).toBeNull();
  });
});
