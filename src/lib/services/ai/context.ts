import type { BuildContextParams, Session, IntervalDetails } from '@/lib/types';
import { generateIntervalStructure, getEffortPace } from '@/lib/utils/intervals';
import { normalizePaceFormat } from '@/lib/utils/pace';
import { parseDuration, formatDuration } from '@/lib/utils/duration';

function isIntervalDetails(value: unknown): value is IntervalDetails {
  return typeof value === 'object' && value !== null;
}

/**
 * Normalizes pace for display in context, with fallback to '00:00'
 * Uses the centralized normalizePaceFormat from duration.ts
 */
function normalizePace(pace?: string): string {
  if (!pace || typeof pace !== 'string') return '00:00';
  return normalizePaceFormat(pace) ?? '00:00';
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

function calculateSessionTypeStats(sessions: Session[]): string {
  const sessionsByType: Record<string, Session[]> = {};
  const sessionsWithIntervals: Session[] = [];

  sessions.forEach(s => {
    const type = s.sessionType || 'Autre';
    if (type === 'Fractionné' || type === 'VMA' || type === 'Seuil' || type === 'Tempo') {
        sessionsWithIntervals.push(s);
    } else {
        if (!sessionsByType[type]) sessionsByType[type] = [];
        sessionsByType[type].push(s);
    }
  });

  let stats = '';

  let hasStandardStats = false;
  const standardStatsStr = Object.entries(sessionsByType)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([type, typeSessions]) => {
      const recent = typeSessions.slice(0, 10);
      if (recent.length === 0) return null;
      hasStandardStats = true;

      const count = recent.length;
      const totalDist = recent.reduce((sum, s) => sum + s.distance, 0);
      const avgDist = totalDist / count;

      const totalDurationSec = recent.reduce((sum, s) => sum + (parseDuration(s.duration) || 0), 0);
      const avgDurationSec = totalDurationSec / count;

      let avgPaceStr = '00:00';
        if (totalDist > 0 && totalDurationSec > 0) {
            const paceSec = totalDurationSec / totalDist;
            avgPaceStr = formatDuration(paceSec);
        }

      const sessionsWithHR = recent.filter(s => s.avgHeartRate > 0);
      const avgHR = sessionsWithHR.length > 0 
         ? sessionsWithHR.reduce((sum, s) => sum + s.avgHeartRate, 0) / sessionsWithHR.length 
         : 0;

      let line = `- ${type} (${count} dern.): moy. ${avgDist.toFixed(1)}km, ${formatDuration(avgDurationSec)}, ${avgPaceStr}/km`;
      if (avgHR > 0) line += `, FC ${Math.round(avgHR)}`;
      return line;
    })
    .filter(Boolean)
    .join('\n');

  if (hasStandardStats) {
      stats += '** Statistiques (Endurance/Standard) :**\n' + standardStatsStr + '\n';
  }

  if (sessionsWithIntervals.length > 0) {
      stats += '\n** Dernières séances de qualité (Fractionné/VMA) :**\n';
      const recentIntervals = sessionsWithIntervals.slice(0, 10); 
      
      recentIntervals.forEach((s) => {
          const d = getSessionData(s);
          let structure = '';
          let effortPace = '';
          
          if (d.intervalDetails && isIntervalDetails(d.intervalDetails)) {
              structure = generateIntervalStructure(d.intervalDetails) || '';
              const pace = getEffortPace(d.intervalDetails);
              if (pace) effortPace = ` @ ${pace}/km (efforts)`;
          }
          
          stats += `- ${d.date} (${d.type}): ${d.distance}km (Moy. ${d.avgPace})`;
          if (structure) stats += `\n  Structure: ${structure}${effortPace}`;
          if (d.comments) stats += `\n  Note: ${d.comments.slice(0, 100).replace(/\n/g, ' ')}`;
          stats += '\n';
      });
  }
  
  return stats;
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
        if (structure) context += `   Structure: ${structure}\n`;
      }
      if (sessionData.comments && sessionData.comments.trim()) {
        context += `   Sensations: ${sessionData.comments}\n`;
      }
    });
    context += '\n';
  } else {
    context += '** Séances de la semaine en cours :** Aucune séance cette semaine\n\n';
  }

  if (hasHistory) {
    context += '** Historique global :**\n';
    
    const totalSessions = allSessions.length;
    const totalDistance = allSessions.reduce((sum, s) => sum + s.distance, 0);

    context += `- ${totalSessions} séances totales, ${totalDistance.toFixed(1)} km au total.\n`;

    context += '\n' + calculateSessionTypeStats(allSessions);

    const numberOfDetailedSessions = Math.min(3, allSessions.length);
    context += `\n** 3 Dernières séances (détail) :**\n`;
    const recentSessions = [...allSessions].slice(0, numberOfDetailedSessions); 
    recentSessions.forEach((s, index) => {
      const sessionData = getSessionData(s);
      context += `${index + 1}. ${sessionData.date} - ${sessionData.type}\n`;
      context += `   ${sessionData.duration}, ${sessionData.distance}km @ ${sessionData.avgPace}/km, FC ${sessionData.avgHeartRate}`;
      if (sessionData.intervalDetails && isIntervalDetails(sessionData.intervalDetails)) {
         const st = generateIntervalStructure(sessionData.intervalDetails);
         if (st) context += `, Structure: ${st}`;
      }
      context += '\n';
    });
  } else {
    context += '** Historique :** Aucune séance enregistrée\n';
  }

  context += '\n=== FIN DU CONTEXTE ===\n';

  return context;
}