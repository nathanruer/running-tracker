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

  it('should reclassify last recovery as cooldown if no cooldown exists', () => {
    const csv = `
"Type d'étape","Durée"
"Course","05:00"
"Récupération","02:00"
    `.trim();

    const result = parseGarminCSV(csv);
    
    expect(result?.steps).toHaveLength(2);
    expect(result?.steps[1].stepType).toBe('cooldown');
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

  it('should parse pace correctly and preserve unique values per step', () => {
    const csv = `
"Type d'étape","Durée","Distance","Allure moyenne","Fréquence cardiaque moyenne"
"Échauffement","14:38","2.17","6:46","142"
"Course à pied","15:00","2.91","5:09","166"
"Repos","02:00","0.26","7:41","165"
"Course à pied","15:00","3.04","4:56","174"
"Récupération","06:32","0.93","7:02","159"
    `.trim();

    const result = parseGarminCSV(csv);

    expect(result).not.toBeNull();
    expect(result?.steps).toHaveLength(5);

    expect(result?.steps[0].stepType).toBe('warmup');
    expect(result?.steps[0].pace).toBe('6:46');
    expect(result?.steps[0].hr).toBe(142);

    expect(result?.steps[1].stepType).toBe('effort');
    expect(result?.steps[1].distance).toBe(2.91);
    expect(result?.steps[1].pace).toBe('5:09');
    expect(result?.steps[1].hr).toBe(166);

    expect(result?.steps[2].stepType).toBe('recovery');
    expect(result?.steps[2].pace).toBe('7:41');

    expect(result?.steps[3].stepType).toBe('effort');
    expect(result?.steps[3].distance).toBe(3.04);
    expect(result?.steps[3].pace).toBe('4:56');
    expect(result?.steps[3].hr).toBe(174);

    expect(result?.steps[4].stepType).toBe('cooldown');
    expect(result?.steps[4].pace).toBe('7:02');
  });

  it('should return null when required headers (Type d\'étape or Durée) are missing', () => {
    // Missing "Type d'étape" header
    const csvMissingType = `
"Durée","Distance","Allure moyenne"
"10:00","1.5","6:00"
    `.trim();

    expect(parseGarminCSV(csvMissingType)).toBeNull();

    // Missing "Durée" header
    const csvMissingDuration = `
"Type d'étape","Distance","Allure moyenne"
"Course","1.5","6:00"
    `.trim();

    expect(parseGarminCSV(csvMissingDuration)).toBeNull();
  });

  it('should skip rows with unrecognized step types (mapStepType returns null)', () => {
    const csv = `
"Type d'étape","Durée","Distance"
"Course","05:00","1.0"
"Unknown Type","02:00","0.2"
"Marche","03:00","0.3"
    `.trim();

    const result = parseGarminCSV(csv);

    // Only "Course" should be parsed, "Unknown Type" and "Marche" should be skipped
    expect(result).not.toBeNull();
    expect(result?.steps).toHaveLength(1);
    expect(result?.steps[0].stepType).toBe('effort');
  });
});
