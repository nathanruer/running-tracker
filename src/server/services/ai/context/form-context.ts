import 'server-only';
import type { Session } from '@/lib/types';
import { parseDuration, formatDuration } from '@/lib/utils/duration';
import { isQualitySessionType } from '@/lib/utils/session-type';

/** What the athlete is actually able to run right now — measured, never guessed by the model. */
export interface AthleteForm {
  /** Kilometres run over the last 7 and 28 days. */
  weeklyKm: number;
  monthlyKm: number;
  sessionsPerWeek: number;
  /** Longest run of the last 28 days, in kilometres. */
  longestRunKm: number;
  /** Longest run ever, for context. */
  longestRunEverKm: number;
  /** Average easy pace of the last 28 days, in seconds per kilometre. */
  easyPaceSKm: number | null;
  /** Fastest pace held over a full session in the last 12 weeks. */
  bestRecentPaceSKm: number | null;
  daysSinceLastQuality: number | null;
  lastQualityLabel: string | null;
  /** Days without running before the last stretch of training, when it exceeds three weeks. */
  breakDays: number | null;
  weeksSinceReturn: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BREAK_DAYS = 21;

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function sessionDate(session: Session): Date | null {
  const raw = session.localDate || session.date;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function paceOf(session: Session): number | null {
  const pace = parseDuration(session.avgPace);
  return pace && pace > 0 ? pace : null;
}

/** Reads the training log into the handful of numbers a coach checks before writing a week. */
export function buildAthleteForm(sessions: Session[], today: Date = new Date()): AthleteForm {
  const dated = sessions
    .map((session) => ({ session, date: sessionDate(session) }))
    .filter((entry): entry is { session: Session; date: Date } => entry.date !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const within = (days: number) => dated.filter((entry) => daysBetween(entry.date, today) <= days);
  const lastWeek = within(7);
  const lastMonth = within(28);

  const sum = (entries: typeof dated, pick: (session: Session) => number) =>
    entries.reduce((total, entry) => total + (pick(entry.session) || 0), 0);

  const monthKm = sum(lastMonth, (session) => session.distance ?? 0);
  const easySessions = lastMonth.filter((entry) => !isQualitySessionType(entry.session.sessionType));
  const easyKm = sum(easySessions, (session) => session.distance ?? 0);
  const easySeconds = sum(easySessions, (session) => parseDuration(session.duration) ?? 0);

  const quality = dated.find((entry) => isQualitySessionType(entry.session.sessionType));
  const recentPaces = within(84)
    .map((entry) => paceOf(entry.session))
    .filter((pace): pace is number => pace !== null);

  // A gap of more than three weeks in the last six months is a break the plan must respect.
  let breakDays: number | null = null;
  let returnDate: Date | null = null;
  const halfYear = within(182);
  for (let index = 0; index < halfYear.length - 1; index++) {
    const gap = daysBetween(halfYear[index + 1].date, halfYear[index].date);
    if (gap >= BREAK_DAYS) {
      breakDays = gap;
      returnDate = halfYear[index].date;
      break;
    }
  }

  return {
    weeklyKm: Math.round(sum(lastWeek, (session) => session.distance ?? 0) * 10) / 10,
    monthlyKm: Math.round(monthKm * 10) / 10,
    sessionsPerWeek: Math.round((lastMonth.length / 4) * 10) / 10,
    longestRunKm: Math.round(Math.max(0, ...lastMonth.map((entry) => entry.session.distance ?? 0)) * 100) / 100,
    longestRunEverKm: Math.round(Math.max(0, ...dated.map((entry) => entry.session.distance ?? 0)) * 100) / 100,
    easyPaceSKm: easyKm > 0 && easySeconds > 0 ? Math.round(easySeconds / easyKm) : null,
    bestRecentPaceSKm: recentPaces.length ? Math.min(...recentPaces) : null,
    daysSinceLastQuality: quality ? daysBetween(quality.date, today) : null,
    lastQualityLabel: quality
      ? `${quality.session.sessionType ?? 'Fractionné'} du ${quality.session.localDate ?? quality.session.date?.slice(0, 10) ?? '?'}`
      : null,
    breakDays,
    weeksSinceReturn: returnDate ? Math.max(0, Math.floor(daysBetween(returnDate, today) / 7)) : null,
  };
}

function pace(seconds: number | null): string {
  return seconds ? `${formatDuration(seconds)}/km` : 'inconnue';
}

/** The same numbers, written for the model, with the limits they impose on this week. */
export function formatAthleteForm(form: AthleteForm): string {
  const lines = [
    'ÉTAT DE FORME MESURÉ (calculé sur les séances réelles, ne pas extrapoler au-delà) :',
    `- 7 derniers jours : ${form.weeklyKm} km`,
    `- 28 derniers jours : ${form.monthlyKm} km, ${form.sessionsPerWeek} séances/semaine`,
    `- plus longue sortie des 28 derniers jours : ${form.longestRunKm} km (record historique : ${form.longestRunEverKm} km)`,
    `- allure footing récente : ${pace(form.easyPaceSKm)}`,
    `- meilleure allure tenue sur une séance entière (12 semaines) : ${pace(form.bestRecentPaceSKm)}`,
  ];

  if (form.lastQualityLabel) {
    lines.push(`- dernière séance qualité : ${form.lastQualityLabel} (il y a ${form.daysSinceLastQuality} jours)`);
  } else {
    lines.push('- aucune séance qualité récente');
  }

  if (form.breakDays) {
    lines.push(
      `- REPRISE : ${form.breakDays} jours sans courir, retour il y a ${form.weeksSinceReturn} semaine(s). ` +
        'Une seule séance qualité par semaine, et elle reste courte : tempo, lignes droites ou fartlek ' +
        "plutôt que VMA tant que la reprise n'a pas six semaines."
    );
  }

  lines.push(
    '',
    'LIMITES POUR CETTE SEMAINE (impératives) :',
    `- aucune séance au-delà de ${Math.round(form.longestRunKm * 1.5 * 10) / 10} km`,
    `- volume total des séances proposées entre ${Math.round(form.weeklyKm * 0.9 * 10) / 10} et ${Math.round(form.weeklyKm * 1.2 * 10) / 10} km : ` +
      'ni moins que la semaine passée, ni plus de 20 % au-dessus',
    form.easyPaceSKm
      ? `- allure des footings entre ${pace(form.easyPaceSKm)} et ${pace(form.easyPaceSKm + 40)}, jamais plus rapide`
      : '- allures de footing prudentes',
    form.bestRecentPaceSKm
      ? `- allure des efforts jamais plus rapide que ${pace(Math.max(150, form.bestRecentPaceSKm - 20))}`
      : '- pas de travail rapide tant que rien de récent ne permet de calibrer',
    "- une seule séance qualité par semaine, jamais deux jours d'affilée."
  );

  return lines.join('\n');
}
