import { describe, it, expect } from 'vitest';
import { parseIntervalCSV } from '@/lib/parsers/interval-csv-parser';

describe('interval-csv-parser', () => {
  it('should parse a valid Garmin CSV correctly', () => {
    const csvContent = `Type d'étape,Heure de début,Durée,Distance,Altitude moyenne,Altitude maximale,Allure moyenne,Gain d'altitude,Perte d'altitude,Fréquence cardiaque moyenne,Fréquence cardiaque maximale,Calories
Échauffement,12:00,10:00,1.5,100,110,6:40,10,10,135,145,100
Course,12:10,05:00,1.0,100,110,5:00,0,0,165,175,80
Repos,12:15,02:00,0.25,100,110,8:00,0,0,140,150,20
Course,12:17,05:00,1.0,100,110,5:00,0,0,165,175,80
Récupération,12:22,10:00,1.5,100,110,6:40,10,10,130,140,90
Récapitulatif,12:00,32:00,5.25,100,110,6:06,20,20,145,175,370`;

    const result = parseIntervalCSV(csvContent);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.steps).toHaveLength(5);
    expect(result.repetitionCount).toBe(2);
    expect(result.totalDistance).toBe(5.25);
    expect(result.avgHeartRate).toBe(145);
    
    expect(result.steps[0].stepType).toBe('warmup');
    expect(result.steps[1].stepType).toBe('effort');
    expect(result.steps[2].stepType).toBe('recovery');
    expect(result.steps[3].stepType).toBe('effort');
    expect(result.steps[4].stepType).toBe('cooldown');
  });

  it('should return null for empty content', () => {
    expect(parseIntervalCSV('')).toBeNull();
  });

  it('should return null for invalid CSV format', () => {
    expect(parseIntervalCSV('invalid,csv,data')).toBeNull();
  });

  it('should handle missing columns gracefully', () => {
    const csvContent = `Type d'étape,Durée,Distance
Échauffement,10:00,1.5
Course,05:00,1.0
Récapitulatif,15:00,2.5`;
    
    const result = parseIntervalCSV(csvContent);
    expect(result).not.toBeNull();
    expect(result?.steps).toHaveLength(2);
    expect(result?.steps[0].hr).toBeNull();
  });

  it('should handle corrupted numeric values', () => {
    const csvContent = `Type d'étape,Durée,Distance,Fréquence cardiaque moyenne
Course,05:00,CORRUPTED,INVALID
Récapitulatif,05:00,0,0`;
    
    const result = parseIntervalCSV(csvContent);
    expect(result).not.toBeNull();
    expect(result?.steps[0].distance).toBeNaN();
    expect(result?.steps[0].hr).toBeNaN();
  });
});
