import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

/**
 * API Route pour générer des recommandations de séances pour compléter la semaine
 * 
 * Analyse les séances déjà réalisées dans la semaine et génère des recommandations
 * adaptées pour les séances restantes, en tenant compte :
 * - Des types de séances déjà effectuées
 * - De la charge d'entraînement actuelle
 * - Des allures et FC observées
 */
export async function POST(request: NextRequest) {
  try {
    const { completedSessions, recentSessions = [], remainingSessions, userProfile } = await request.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API Groq manquante. Veuillez configurer GROQ_API_KEY dans .env' },
        { status: 500 }
      );
    }

    // Validation des entrées
    if (!Array.isArray(completedSessions)) {
      return NextResponse.json(
        { error: 'completedSessions doit être un tableau' },
        { status: 400 }
      );
    }

    if (typeof remainingSessions !== 'number' || remainingSessions < 1) {
      return NextResponse.json(
        { error: 'remainingSessions doit être un nombre >= 1' },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Analyser les séances complétées cette semaine
    const sessionsSummary = completedSessions.map((session: any) => ({
      type: session.sessionType,
      duration_min: parseFloat(session.duration) || 0,
      distance_km: session.distance,
      pace_min_km: session.avgPace,
      avg_hr: session.avgHeartRate,
      date: session.date,
    }));

    // Analyser l'historique récent pour établir les références de performance
    const historyAnalysis = recentSessions.reduce((acc: any, session: any) => {
      const type = session.sessionType;
      if (!acc[type]) {
        acc[type] = { count: 0, totalPaceSeconds: 0, totalHr: 0, sessions: [] };
      }
      
      // Convertir allure "MM:SS" en secondes
      const [min, sec] = (session.avgPace || "0:0").split(':').map(Number);
      const paceSeconds = min * 60 + sec;
      
      if (paceSeconds > 0) {
        acc[type].count++;
        acc[type].totalPaceSeconds += paceSeconds;
        acc[type].totalHr += session.avgHeartRate || 0;
        acc[type].sessions.push({
          date: session.date,
          pace: session.avgPace,
          hr: session.avgHeartRate,
          dist: session.distance
        });
      }
      return acc;
    }, {});

    // Créer un résumé textuel des performances par type
    let performanceContext = "Historique des performances récentes (référence pour les allures) :\n";
    for (const [type, data] of Object.entries(historyAnalysis) as [string, any][]) {
      if (data.count > 0) {
        const avgPaceSec = data.totalPaceSeconds / data.count;
        const avgMin = Math.floor(avgPaceSec / 60);
        const avgSec = Math.round(avgPaceSec % 60);
        const avgPace = `${avgMin}:${avgSec.toString().padStart(2, '0')}`;
        const avgHr = Math.round(data.totalHr / data.count);
        performanceContext += `- ${type}: Moyenne ${avgPace}/km @ ${avgHr}bpm (basé sur ${data.count} séances)\n`;
        
        // Ajouter les 3 dernières séances de ce type pour montrer la tendance
        const last3 = data.sessions.slice(-3).reverse();
        performanceContext += `  Dernières séances ${type}: ${last3.map((s: any) => `${s.dist}km à ${s.pace}/km (${s.hr}bpm)`).join(', ')}\n`;
      }
    }

    // Calculer la charge totale de la semaine
    const totalDistance = completedSessions.reduce((sum: number, s: any) => sum + s.distance, 0);
    const totalDuration = completedSessions.reduce((sum: number, s: any) => sum + (parseFloat(s.duration) || 0), 0);

    // Types de séances déjà effectuées
    const sessionTypes = completedSessions.map((s: any) => s.sessionType).join(', ');
    const today = new Date().toLocaleDateString('fr-FR');

    const prompt = `**RÔLE :** Tu es un Coach Expert en Programmation d'Entraînement de Course à Pied, spécialisé dans la gestion de la charge d'entraînement. Ta réponse doit être uniquement le format JSON demandé.

**MISSION :** Nous sommes le ${today}. Analyse le profil de l'athlète et le volume d'entraînement déjà réalisé cette semaine pour générer EXCLUSIVEMENT et EXACTEMENT ${remainingSessions} séances supplémentaires. Ces séances doivent optimiser l'équilibre charge/récupération pour compléter la semaine en cours.

---

**DONNÉES D'ENTRÉE – Profil et Historique (Analyse Factuelle Requise) :**

1.  **PROFIL (Référence pour estimations) :**
    * FC Max: ${userProfile?.maxHeartRate || 'INCONNU'} bpm
    * VMA: ${userProfile?.vma || 'INCONNU'} km/h
    * Âge: ${userProfile?.age || 'INCONNU'} ans
    * Poids: ${userProfile?.weight || 'INCONNU'} kg

2.  **CHARGE DÉJÀ EFFECTUÉE (Base de la décision) :**
    * Nombre de séances Complétées : ${completedSessions.length}
    * Séances : ${JSON.stringify(sessionsSummary, null, 2)}
    * Distance Totale : ${totalDistance.toFixed(2)} km
    * Durée Totale : ${Math.round(totalDuration)} minutes
    * Types d'effort : ${sessionTypes || 'Aucune séance'}

3.  **RÉFÉRENCES DE PERF (VALEURS IMPÉRATIVES) :**
    * **PRIORITÉ ABSOLUE :** ${performanceContext || 'AUCUN HISTORIQUE FOURNI. Estime les allures et FC cibles avec la VMA/FC Max si elles sont renseignées, sinon utilise des standards de coach.'}

---

**CONSIGNES DE GÉNÉRATION (Règles Strictes) :**

1.  **QUANTITÉ OBLIGATOIRE :** Génère **EXACTEMENT ${remainingSessions}** objet(s) dans le tableau \`recommended_sessions\`.
2.  **LOGIQUE DE PLANIFICATION ET ORDRE :**
    * Si la dernière séance de la liste \`$sessionsSummary\` était intense (Fractionné, Seuil) **ET qu'elle date de moins de 48h**, la première séance recommandée DOIT être une récupération ou un footing facile.
    * Ne propose **jamais** deux séances intenses consécutives.
    * Ordonne les séances chronologiquement pour la fin de semaine.
3.  **COHÉRENCE DES ZONES ET ALLURES (Contrôle Qualité) :**
    * **Allures (\`target_pace_min_km\`) :** Utilise l'allure moyenne des séances similaires dans \`$sessionsSummary\` ou \`$performanceContext\`.
        * Footing / Récupération : Allure proche de la moyenne historique (±5 sec/km) ou environ 60-75% VMA. Format requis : "MM:SS/km".
    * **FC Cibles (\`target_hr\`) :** Utilise \`$performanceContext\` ou les pourcentages suivants (basés sur FC Max) :
        * Récupération / Léger (Zone 1) : FC cible entre **60-70% de la FC Max**.
        * Endurance (Zone 2 - Sortie Longue) : FC cible entre **70-80% de la FC Max**.
        * Intervalle (Fractionné) : FC cible en effort proche de **90-95% de la FC Max**.
    * **NE JAMAIS** utiliser la même FC cible pour des séances de nature et d'intensité différentes.
4.  **JUSTIFICATION :** Le champ \`reason\` doit contenir une justification brève et personnalisée pour chaque séance. **Interdiction d'utiliser des emojis.**

---

**FORMAT DE SORTIE (STRICT - AUCUNE EXCEPTION) :**

La réponse doit être **UNIQUEMENT et STRICTEMENT** un objet JSON valide, SANS aucun autre texte, introduction, conclusion, ou markdown (\` \`\`\`json \` ) autour.

**Format JSON attendu :**
{
  "recommended_sessions": [
    {
      "type": "footing|fractionné|sortie longue|récupération",
      "duration_min": 45,
      "target_pace_min_km": "Doit être au format MM:SS/km et correspondre à l'historique",
      "target_hr": "Doit correspondre à l'historique/zone cible. Chiffre uniquement.",
      "estimated_distance_km": 5.2,
      "interval_structure": "Structure pour fractionné (ex: 10x400m R1'30), sinon vide",
      "reason": "Justification courte et personnalisée"
    }
  ],
  "week_summary": "Résumé de la semaine et stratégie de recommandation, sans emojis"
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content || '';

    // Extraire le JSON de la réponse
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide de l\'IA');
    }

    const recommendations = JSON.parse(jsonMatch[0]);

    // Validation de la structure de sortie
    if (!recommendations.recommended_sessions || !Array.isArray(recommendations.recommended_sessions)) {
      throw new Error('Structure de recommandations invalide');
    }

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error('Erreur lors de la génération des recommandations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération des recommandations', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    );
  }
}
