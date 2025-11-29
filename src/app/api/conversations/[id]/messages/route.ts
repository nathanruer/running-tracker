import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/database';
import Groq from 'groq-sdk';
import { buildSystemPrompt, buildContextMessage } from '@/lib/services/ai';
import { logger } from '@/lib/infrastructure/logger';
import { getOptimizedConversationHistory } from '@/lib/services/ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const conversation = await prisma.chat_conversations.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvée' }, { status: 404 });
    }

    const { content, currentWeekSessions, allSessions } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Contenu invalide' }, { status: 400 });
    }

    // Trouver le numéro de séance le plus élevé parmi les séances complétées
    const lastCompletedSession = await prisma.training_sessions.findFirst({
      where: {
        userId,
        status: 'completed'
      },
      orderBy: { sessionNumber: 'desc' },
    });
    const nextSessionNumber = lastCompletedSession ? lastCompletedSession.sessionNumber + 1 : 1;

    const userMessage = await prisma.chat_messages.create({
      data: {
        conversationId: id,
        role: 'user',
        content,
      },
    });

    const optimizedHistory = await getOptimizedConversationHistory(id, content);

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API Groq manquante' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = buildSystemPrompt();

    const contextMessage = buildContextMessage({
      currentWeekSessions: currentWeekSessions || [],
      allSessions: allSessions || [],
      userProfile: {
        maxHeartRate: user.maxHeartRate || undefined,
        vma: user.vma || undefined,
        age: user.age || undefined,
      },
      nextSessionNumber,
    });

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contextMessage },
      ...optimizedHistory.messages,
    ];

    let completion;
    let usedModel = 'llama-3.3-70b-versatile';

    try {
      completion = await groq.chat.completions.create({
        messages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 2500,
        response_format: { type: "json_object" },
      });
    } catch (error: any) {
      if (error?.status === 429 || error?.message?.includes('Rate limit')) {
        logger.warn({ model: 'llama-3.3-70b-versatile', error }, 'Rate limit reached, trying fallback model');

        try {
          usedModel = 'llama-3.1-8b-instant';
          completion = await groq.chat.completions.create({
            messages,
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            max_tokens: 2500,
            response_format: { type: "json_object" },
          });
        } catch (fallbackError: any) {
          if (fallbackError?.status === 429 || fallbackError?.message?.includes('Rate limit')) {
            logger.warn({ error: fallbackError }, 'All models rate limited');
            const errorMessage = await prisma.chat_messages.create({
              data: {
                conversationId: id,
                role: 'assistant',
                content: "Désolé, le quota de tokens quotidien est épuisé pour tous les modèles. Veuillez réessayer dans quelques heures.",
              },
            });
            return NextResponse.json({
              userMessage,
              assistantMessage: errorMessage,
            });
          } else {
            throw fallbackError;
          }
        }
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
    let response;
    try {
      response = JSON.parse(rawJson);
    } catch (parseError) {
      logger.error({ rawJson: rawJson.substring(0, 500), parseError }, 'Erreur lors du parsing JSON');
      throw new Error('Format de réponse invalide de l\'IA: JSON malformé');
    }

    if (response.responseType === 'recommendations' && response.recommended_sessions) {
      response.recommended_sessions = response.recommended_sessions.map((session: any, idx: number) => {
        const recommendationId = randomUUID();

        if (!session.target_pace_min_km || typeof session.target_pace_min_km !== 'string') {
          return { ...session, recommendation_id: recommendationId };
        }

        const paceMatch = session.target_pace_min_km.match(/^(\d+):(\d+)$/);
        if (!paceMatch) return { ...session, recommendation_id: recommendationId };

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

    const assistantMessage = await prisma.chat_messages.create({
      data: {
        conversationId: id,
        role: 'assistant',
        content: response.responseType === 'conversation'
          ? response.message
          : (response.week_summary || response.rationale || "Voici vos recommandations d'entraînement."),
        recommendations: response.responseType === 'recommendations'
          ? response
          : null,
        model: usedModel,
      },
    });

    await prisma.chat_conversations.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
      response,
    });
  } catch (error) {
    const { id } = await params;
    logger.error({ error, conversationId: id }, 'Failed to add message to conversation');
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du message', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
