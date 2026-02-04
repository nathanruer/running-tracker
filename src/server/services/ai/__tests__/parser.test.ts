import { describe, it, expect } from 'vitest';
import { extractJsonFromAI, parseAndValidateAIResponse, AIParseError } from '../parser';

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

  it('should throw AIParseError if no JSON found', () => {
    const text = 'This is just plain text without any JSON';

    expect(() => extractJsonFromAI(text)).toThrow(AIParseError);
    expect(() => extractJsonFromAI(text)).toThrow('JSON non trouvé dans la réponse IA');
  });

  it('should throw AIParseError for incomplete JSON', () => {
    const text = '{"responseType":"conversation"';

    expect(() => extractJsonFromAI(text)).toThrow(AIParseError);
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

  it('should preserve rawText in AIParseError', () => {
    const text = 'invalid content';

    try {
      extractJsonFromAI(text);
    } catch (error) {
      expect(error).toBeInstanceOf(AIParseError);
      expect((error as AIParseError).rawText).toBe(text);
    }
  });
});

describe('parseAndValidateAIResponse', () => {
  it('should parse and validate a conversation response', () => {
    const text = '{"responseType":"conversation","message":"Hello"}';
    const result = parseAndValidateAIResponse(text);

    expect(result.responseType).toBe('conversation');
    if (result.responseType === 'conversation') {
      expect(result.message).toBe('Hello');
    }
  });

  it('should parse and validate a recommendations response', () => {
    const text = '{"responseType":"recommendations","recommended_sessions":[{"duration_min":60,"estimated_distance_km":10}]}';
    const result = parseAndValidateAIResponse(text);

    expect(result.responseType).toBe('recommendations');
    if (result.responseType === 'recommendations') {
      expect(result.recommended_sessions).toHaveLength(1);
    }
  });

  it('should throw AIParseError for invalid schema', () => {
    const text = '{"responseType":"recommendations"}';

    expect(() => parseAndValidateAIResponse(text)).toThrow(AIParseError);
    expect(() => parseAndValidateAIResponse(text)).toThrow('Validation échouée');
  });

  it('should throw AIParseError for unknown responseType', () => {
    const text = '{"responseType":"unknown","data":{}}';

    expect(() => parseAndValidateAIResponse(text)).toThrow(AIParseError);
  });

  it('should parse from markdown code block', () => {
    const text = '```json\n{"responseType":"conversation","message":"Test"}\n```';
    const result = parseAndValidateAIResponse(text);

    expect(result.responseType).toBe('conversation');
  });

  it('should include rawText in error for debugging', () => {
    const text = '{"invalid":"response"}';

    try {
      parseAndValidateAIResponse(text);
    } catch (error) {
      expect(error).toBeInstanceOf(AIParseError);
      expect((error as AIParseError).rawText).toBe(text);
    }
  });
});

describe('AIParseError', () => {
  it('should have correct name', () => {
    const error = new AIParseError('test error');
    expect(error.name).toBe('AIParseError');
  });

  it('should store rawText', () => {
    const error = new AIParseError('test error', 'raw text content');
    expect(error.rawText).toBe('raw text content');
  });

  it('should work without rawText', () => {
    const error = new AIParseError('test error');
    expect(error.rawText).toBeUndefined();
  });
});
