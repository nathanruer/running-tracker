import type { BuildContextParams, Session, IntervalDetails } from '@/lib/types';
import { generateIntervalStructure } from '@/lib/utils';

function isIntervalDetails(value: unknown): value is IntervalDetails {
  return typeof value === 'object' && value !== null;
}

function normalizePace(pace?: string): string {
  if (!pace || typeof pace !== 'string') return '00:00';
  const parts = pace.split(':');
  if (parts.length === 2) return pace;
  return '00:00';
}

function getSessionData(s: Session) {
  return {
    date: s.date,
    type: s.sessionType,
    duration: s.duration,
    distance: s.distance,
    avgPace: normalizePace(s.avgPace),
    avgHeartRate: s.avgHeartRate,
    perceivedExertion: s.perceivedExertion,
    comments: s.comments,
    intervalDetails: s.intervalDetails,
  };
}

export function buildContextMessage({
  currentWeekSessions,
  allSessions,
  userProfile,
  nextSessionNumber,
}: BuildContextParams): string {
  const hasCurrentWeek = currentWeekSessions && currentWeekSessions.length > 0;
  const hasHistory = allSessions && allSessions.length > 0;

  let context = '=== CONTEXTE UTILISATEUR ===\n\n';

  context += '** Profil :**\n';
  if (userProfile.age) {
    context += `- Âge : ${userProfile.age} ans\n`;
  }
  if (userProfile.maxHeartRate) {
    context += `- Fréquence cardiaque maximale : ${userProfile.maxHeartRate} bpm\n`;
  }
  if (userProfile.vma) {
    context += `- VMA : ${userProfile.vma} km/h\n`;
  }
  if (userProfile.goal) {
    context += `- Objectif : ${userProfile.goal}\n`;
  }
  if (!userProfile.age && !userProfile.maxHeartRate && !userProfile.vma && !userProfile.goal) {
    context += '- Profil non renseigné\n';
  }

  if (nextSessionNumber) {
    context += `- Prochain numéro de séance : ${nextSessionNumber}\n`;
  }

  context += '\n';

  if (hasCurrentWeek) {
    context += '** Séances de la semaine en cours :**\n';
    currentWeekSessions.forEach((s, index) => {
      const sessionData = getSessionData(s);
      context += `${index + 1}. ${sessionData.date} - ${sessionData.type}\n`;
      context += `   Durée: ${sessionData.duration}, Distance: ${sessionData.distance}km, Allure: ${sessionData.avgPace}/km\n`;
      if (sessionData.avgHeartRate > 0) {
        context += `   FC moyenne: ${sessionData.avgHeartRate} bpm\n`;
      }
      if (sessionData.perceivedExertion && sessionData.perceivedExertion > 0) {
        context += `   RPE: ${sessionData.perceivedExertion}/10\n`;
      }
      if (sessionData.intervalDetails && isIntervalDetails(sessionData.intervalDetails)) {
        const structure = generateIntervalStructure(sessionData.intervalDetails);
        if (structure) {
          context += `   Structure: ${structure}\n`;
        }
      }
      if (sessionData.comments && sessionData.comments.trim()) {
        context += `   Sensations/Notes: ${sessionData.comments}\n`;
      }
    });
    context += '\n';
  } else {
    context += '** Séances de la semaine en cours :** Aucune séance cette semaine\n\n';
  }

  if (hasHistory) {
    context += '** Historique complet des entraînements :**\n';
    
    const totalDistance = allSessions.reduce((sum, s) => sum + s.distance, 0);
    const totalSessions = allSessions.length;
    const avgDistance = totalDistance / totalSessions;

    const totalMinutes = allSessions.reduce((sum, s) => {
      if (!s.duration || typeof s.duration !== 'string') {
        return sum;
      }
      const parts = s.duration.split(':');
      if (parts.length !== 3) {
        return sum;
      }
      const [hours, minutes, seconds] = parts.map(Number);
      return sum + hours * 60 + minutes + seconds / 60;
    }, 0);

    const avgDuration = totalMinutes / totalSessions;
    const avgHR = allSessions
      .filter((s) => s.avgHeartRate > 0)
      .reduce((sum, s, _, arr) => sum + s.avgHeartRate / arr.length, 0);

    context += `- Nombre total de séances : ${totalSessions}\n`;
    context += `- Distance totale : ${totalDistance.toFixed(1)} km\n`;
    context += `- Distance moyenne par séance : ${avgDistance.toFixed(1)} km\n`;
    context += `- Durée moyenne : ${Math.floor(avgDuration)} minutes\n`;
    if (avgHR > 0) {
      context += `- FC moyenne globale : ${Math.round(avgHR)} bpm\n`;
    }

    const sessionTypes = allSessions.reduce(
      (acc, s) => {
        acc[s.sessionType] = (acc[s.sessionType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    context += '\n** Répartition des types de séances :**\n';
    Object.entries(sessionTypes)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .forEach(([type, count]) => {
        context += `- ${type} : ${count} séance(s)\n`;
      });

    const numberOfDetailedSessions = Math.min(20, allSessions.length);
    context += `\n** Dernières séances (${numberOfDetailedSessions} plus récentes) :**\n`;
    const recentSessions = [...allSessions].slice(-numberOfDetailedSessions);
    recentSessions.forEach((s, index) => {
      const sessionData = getSessionData(s);
      context += `${index + 1}. ${sessionData.date} - ${sessionData.type}\n`;
      context += `   ${sessionData.duration}, ${sessionData.distance}km @ ${sessionData.avgPace}/km`;
      if (sessionData.avgHeartRate > 0) {
        context += `, FC: ${sessionData.avgHeartRate} bpm`;
      }
      if (sessionData.perceivedExertion && sessionData.perceivedExertion > 0) {
        context += `, RPE: ${sessionData.perceivedExertion}/10`;
      }
      context += '\n';
      if (sessionData.intervalDetails && isIntervalDetails(sessionData.intervalDetails)) {
        const structure = generateIntervalStructure(sessionData.intervalDetails);
        if (structure) {
          context += `   Structure: ${structure}\n`;
        }
      }
      if (sessionData.comments && sessionData.comments.trim()) {
        context += `   Sensations/Notes: ${sessionData.comments}\n`;
      }
    });
  } else {
    context += '** Historique :** Aucune séance enregistrée\n';
  }

  context += '\n=== FIN DU CONTEXTE ===\n';

  return context;
}
