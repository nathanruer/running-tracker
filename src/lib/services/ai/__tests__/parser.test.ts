import { describe, it, expect } from 'vitest';
import { extractJsonFromAI } from '../parser';

describe('extractJsonFromAI', () => {
  it('should extract JSON from clean response', () => {
    const text = '{"responseType":"conversation","message":"Hello"}';
    const result = extractJsonFromAI(text);

    expect(result).toEqual({
      responseType: 'conversation',
      message: 'Hello',
    });
  });

  it('should extract JSON from markdown code block', () => {
    const text = '```json\n{"responseType":"recommendations","recommended_sessions":[]}\n```';
    const result = extractJsonFromAI(text);

    expect(result).toEqual({
      responseType: 'recommendations',
      recommended_sessions: [],
    });
  });

  it('should extract JSON from code block without language specifier', () => {
    const text = '```\n{"responseType":"conversation","message":"Test"}\n```';
    const result = extractJsonFromAI(text);

    expect(result).toEqual({
      responseType: 'conversation',
      message: 'Test',
    });
  });

  it('should extract JSON from text with surrounding content', () => {
    const text = 'Here is the response: {"responseType":"conversation","message":"Hello"} - end';
    const result = extractJsonFromAI(text);

    expect(result).toEqual({
      responseType: 'conversation',
      message: 'Hello',
    });
  });

  it('should handle nested JSON objects', () => {
    const text = '{"responseType":"recommendations","recommended_sessions":[{"duration_min":60,"target_pace_min_km":"5:30","estimated_distance_km":10.9}]}';
    const result = extractJsonFromAI(text);

    expect(result).toEqual({
      responseType: 'recommendations',
      recommended_sessions: [{
        duration_min: 60,
        target_pace_min_km: '5:30',
        estimated_distance_km: 10.9,
      }],
    });
  });

  it('should throw error if no JSON found', () => {
    const text = 'This is just plain text without any JSON';

    expect(() => extractJsonFromAI(text)).toThrow('JSON non trouvé dans la réponse IA');
  });

  it('should throw error for incomplete JSON', () => {
    const text = '{"responseType":"conversation"';

    expect(() => extractJsonFromAI(text)).toThrow();
  });

  it('should handle whitespace around JSON', () => {
    const text = '  \n  {"responseType":"conversation","message":"Test"}  \n  ';
    const result = extractJsonFromAI(text);

    expect(result).toEqual({
      responseType: 'conversation',
      message: 'Test',
    });
  });

  it('should extract from markdown code block with extra whitespace', () => {
    const text = '```json  \n  {"responseType":"conversation","message":"Test"}  \n  ```';
    const result = extractJsonFromAI(text);

    expect(result).toEqual({
      responseType: 'conversation',
      message: 'Test',
    });
  });
});
