import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { buildSystemPrompt, buildContextMessage } from '@/lib/services/ai';
import type { Session, UserProfile } from '@/lib/types';
import { logger } from '@/lib/infrastructure/logger';

interface IAResponse {
  responseType: 'conversation' | 'recommendations';
  message?: string;
  numberOfSessions?: number;
  recommended_sessions?: any[];
  week_summary?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      conversationHistory, 
      currentWeekSessions = [] as Session[], 
      allSessions = [] as Session[], 
      userProfile 
    } = await request.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API Groq manquante. Veuillez configurer GROQ_API_KEY dans .env' },
        { status: 500 }
      );
    }

    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'conversationHistory doit être un tableau' },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = buildSystemPrompt();

    const contextMessage = buildContextMessage({
      currentWeekSessions,
      allSessions,
      userProfile,
    });

    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: contextMessage,
      },
    ];

    const recentHistory = conversationHistory.slice(-5);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    logger.info({ messageCount: messages.length, historyCount: recentHistory.length }, 'Sending request to AI');

    let completion;

    try {
      completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      });
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('Rate limit')) {
        logger.warn({ error }, 'Groq API rate limit reached');
        return NextResponse.json({
          responseType: 'conversation',
          message: "Désolé, le quota de tokens quotidien est épuisé. Veuillez réessayer dans quelques heures."
        });
      } else {
        throw error;
      }
    }

    const text = completion.choices[0]?.message?.content || '';

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const firstCurly = cleanedText.indexOf('{');
    const lastCurly = cleanedText.lastIndexOf('}');

    if (firstCurly === -1 || lastCurly === -1) {
      logger.error({ rawText: text.substring(0, 500) }, 'Format de réponse invalide de l\'IA: JSON non trouvé');
      throw new Error('Format de réponse invalide de l\'IA: JSON non trouvé');
    }

    const rawJson = cleanedText.slice(firstCurly, lastCurly + 1);
    let response: IAResponse;
    try {
      response = JSON.parse(rawJson);
    } catch (parseError) {
      logger.error({ rawJson: rawJson.substring(0, 500), parseError }, 'Erreur lors du parsing JSON');
      throw new Error('Format de réponse invalide de l\'IA: JSON malformé');
    }

    if (!response.responseType || !['conversation', 'recommendations'].includes(response.responseType)) {
      throw new Error('Type de réponse invalide');
    }

    if (response.responseType === 'recommendations') {
      if (!response.recommended_sessions || !Array.isArray(response.recommended_sessions)) {
        throw new Error('recommended_sessions doit être un tableau');
      }

      const expectedCount = response.numberOfSessions;
      const actualCount = response.recommended_sessions.length;

      logger.info({ expectedCount, actualCount }, 'Recommendations generated');

      if (actualCount !== expectedCount) {
        logger.warn({ expectedCount, actualCount }, 'Session count mismatch, correcting');
        response.numberOfSessions = actualCount;
      }

      response.recommended_sessions = response.recommended_sessions.map((session, idx) => {
        const recommendationId = randomUUID();

        const paceMatch = session.target_pace_min_km?.match(/^(\d+):(\d+)$/);
        if (!paceMatch) {
          logger.warn({ sessionIndex: idx + 1, invalidPace: session.target_pace_min_km }, 'Invalid pace format');
          return { ...session, recommendation_id: recommendationId };
        }

        const paceMin = parseInt(paceMatch[1], 10);
        const paceSec = parseInt(paceMatch[2], 10);
        const paceDecimal = paceMin + (paceSec / 60);

        const expectedDistance = session.duration_min / paceDecimal;
        const currentDistance = session.estimated_distance_km;

        const tolerance = 0.05;
        const difference = Math.abs(currentDistance - expectedDistance) / expectedDistance;

        if (difference > tolerance) {
          logger.warn({
            sessionIndex: idx + 1,
            sessionType: session.type,
            duration: session.duration_min,
            pace: session.target_pace_min_km,
            distanceAI: currentDistance.toFixed(2),
            distanceCorrected: expectedDistance.toFixed(2)
          }, 'Distance calculation incorrect, correcting');
          session.estimated_distance_km = Math.round(expectedDistance * 100) / 100;
        }

        return { ...session, recommendation_id: recommendationId };
      });
    }

    if (response.responseType === 'conversation') {
      logger.info('Simple conversation response generated');
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, 'Failed to generate AI coach response');
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la réponse', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
