import type { StravaActivity } from '@/lib/types';
import { formatDateToISO } from '@/lib/utils/date';

export function formatStravaActivity(activity: StravaActivity) {
  const hours = Math.floor(activity.moving_time / 3600);
  const minutes = Math.floor((activity.moving_time % 3600) / 60);
  const seconds = activity.moving_time % 60;
  const duration = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const distance = Math.round((activity.distance / 1000) * 100) / 100;

  const paceSeconds = distance > 0 ? (activity.moving_time / distance) : 0;
  const paceMinutes = Math.floor(paceSeconds / 60);
  const paceRemainingSeconds = Math.floor(paceSeconds % 60);
  const avgPace = `${paceMinutes.toString().padStart(2, '0')}:${paceRemainingSeconds
    .toString()
    .padStart(2, '0')}`;

  const activityDate = new Date(activity.start_date_local);

  return {
    date: formatDateToISO(activityDate),
    sessionType: '',
    duration,
    distance,
    avgPace,
    avgHeartRate: activity.average_heartrate || 0,
    comments: activity.name || '',
    externalId: activity.id.toString(),
    source: 'strava',
    stravaData: activity,
    elevationGain: activity.total_elevation_gain,
    averageCadence: activity.average_cadence,
    averageTemp: activity.average_temp,
    calories: activity.calories,
  };
}
