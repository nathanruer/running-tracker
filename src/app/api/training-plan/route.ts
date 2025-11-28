import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  try {
    const { sessions, userProfile, additionalSessionsCount = 2 } = await request.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API Groq manquante. Veuillez configurer GROQ_API_KEY dans .env' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Calculer la semaine actuelle
    const now = new Date();
    const currentWeek = sessions.length > 0 ? sessions[sessions.length - 1]?.week || 1 : 1;

    // Filtrer les séances de la semaine en cours
    const currentWeekSessions = sessions.filter((s: any) => s.week === currentWeek);

    // Analyser les séances de la semaine en cours
    const weekDistance = currentWeekSessions.reduce((sum: number, s: any) => sum + s.distance, 0);
    const weekTypes = currentWeekSessions.reduce((acc: any, s: any) => {
      acc[s.sessionType] = (acc[s.sessionType] || 0) + 1;
      return acc;
    }, {});

    // Analyser l'historique global
    const avgWeeklyDistance = sessions.length > 0
      ? sessions.reduce((sum: number, s: any) => sum + s.distance, 0) / Math.max(1, currentWeek)
      : 0;

    const prompt = `Tu es un coach sportif expert. Complète la semaine d'entraînement en cours en ajoutant ${additionalSessionsCount} séance(s) complémentaire(s).

**Profil de l'athlète:**
- FC Max: ${userProfile?.maxHeartRate || 'Non renseignée'} bpm
- VMA: ${userProfile?.vma || 'Non renseignée'} km/h
- Âge: ${userProfile?.age || 'Non renseigné'} ans
- Distance hebdomadaire moyenne: ${avgWeeklyDistance.toFixed(1)} km

**SÉANCES DÉJÀ FAITES CETTE SEMAINE (Semaine ${currentWeek}):**
${currentWeekSessions.length > 0
  ? JSON.stringify(currentWeekSessions.map((s: any) => ({
      type: s.sessionType,
      distance: s.distance,
      pace: s.avgPace,
      rpe: s.perceivedExertion,
    })), null, 2)
  : 'Aucune séance cette semaine'}

**Distance déjà parcourue cette semaine:** ${weekDistance.toFixed(1)} km
**Types effectués:** ${JSON.stringify(weekTypes)}

**OBJECTIF:** Ajouter ${additionalSessionsCount} séance(s) pour compléter cette semaine

**Principes à respecter:**
1. Équilibre: viser un mix Footing (60%) / Fractionné (20%) / Sortie longue (20%)
2. Si un type manque cette semaine, le prioriser
3. Viser ${avgWeeklyDistance.toFixed(0)}-${(avgWeeklyDistance * 1.1).toFixed(0)} km total pour la semaine
4. Adapter l'intensité selon ce qui a déjà été fait
5. Si déjà 2 séances intenses, proposer du footing facile
6. Si semaine légère, proposer une séance qualitative

Types de séances possibles:
- **Footing**: EF (Endurance Fondamentale) facile et conversationnelle
- **Fractionné**: VMA courte (200m-1'), Tempo (3-5'), ou Seuil (10-20')
- **Sortie longue**: volume long à allure confortable

Pour chaque séance, fournis:
- Type exact (Footing, Fractionné, Sortie longue)
- Distance en km (ex: 8.5)
- Durée estimée HH:MM:SS
- Allure cible MM:SS
- FC cible en bpm
- Structure si fractionné (ex: "VMA: 8x400m/1'30")
- Description motivante

Renvoie UNIQUEMENT ce JSON (pas de markdown):
{
  "sessions": [
    {
      "sessionType": "Footing",
      "distance": 6.5,
      "duration": "00:42:00",
      "avgPace": "06:30",
      "avgHeartRate": 145,
      "intervalStructure": "",
      "description": "Footing récupération après le fractionné"
    }
  ],
  "weekSummary": "Analyse de la semaine avec km totaux prévus",
  "rationale": "Pourquoi ces séances (1-2 phrases)"
}

Sois cohérent et adapté au niveau actuel.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 4000,
    });

    const text = completion.choices[0]?.message?.content || '';

    // Extraire le JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    const plan = JSON.parse(jsonMatch[0]);

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Erreur lors de la génération du plan:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du plan', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
