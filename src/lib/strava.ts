import { logger } from './logger';

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

export async function exchangeCodeForTokens(code: string): Promise<StravaTokens> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  return response.json();
}

export async function getActivities(
  accessToken: string,
  perPage: number = 30
): Promise<StravaActivity[]> {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }

  return response.json();
}

export async function getActivityDetails(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  const response = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    logger.error({
      status: response.status,
      statusText: response.statusText,
      activityId,
      error: errorData,
    }, 'Strava API call failed: getActivityDetails');
    throw new Error(`Failed to fetch activity details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export interface ExistingSession {
  date: string;
  week: number;
  sessionNumber: number;
}

function calculateWeekAndSessionNumber(
  activityDate: Date,
  existingSessions: ExistingSession[]
): { week: number; sessionNumber: number } {
  if (existingSessions.length === 0) {
    return { week: 1, sessionNumber: 1 };
  }

  const allDates = [
    ...existingSessions.map(s => ({
      date: new Date(s.date),
      isNew: false,
      originalWeek: s.week,
      originalSessionNumber: s.sessionNumber,
    })),
    {
      date: activityDate,
      isNew: true,
      originalWeek: 0,
      originalSessionNumber: 0,
    },
  ];

  allDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  let currentWeek = 1;
  let currentWeekSessions: typeof allDates = [];
  const weeks: Array<typeof allDates> = [];

  for (let i = 0; i < allDates.length; i++) {
    const session = allDates[i];
    
    if (currentWeekSessions.length === 0) {
      currentWeekSessions.push(session);
    } else {
      const lastInWeek = currentWeekSessions[currentWeekSessions.length - 1];
      const daysDiff = Math.floor(
        (session.date.getTime() - lastInWeek.date.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 7) {
        currentWeekSessions.push(session);
      } else {
        weeks.push([...currentWeekSessions]);
        currentWeek++;
        currentWeekSessions = [session];
      }
    }
  }

  if (currentWeekSessions.length > 0) {
    weeks.push(currentWeekSessions);
  }

  let week = 1;
  let sessionNumber = 1;

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const weekSessions = weeks[weekIndex];
    const newSessionIndex = weekSessions.findIndex(s => s.isNew);
    
    if (newSessionIndex !== -1) {
      week = weekIndex + 1;
      sessionNumber = newSessionIndex + 1;
      break;
    }
  }

  return { week, sessionNumber };
}

export function formatStravaActivity(
  activity: StravaActivity,
  existingSessions: ExistingSession[] = []
) {
  const hours = Math.floor(activity.moving_time / 3600);
  const minutes = Math.floor((activity.moving_time % 3600) / 60);
  const seconds = activity.moving_time % 60;
  const duration = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const distance = activity.distance / 1000;

  const paceSeconds = distance > 0 ? (activity.moving_time / distance) : 0;
  const paceMinutes = Math.floor(paceSeconds / 60);
  const paceRemainingSeconds = Math.floor(paceSeconds % 60);
  const avgPace = `${paceMinutes.toString().padStart(2, '0')}:${paceRemainingSeconds
    .toString()
    .padStart(2, '0')}`;

  const activityDate = new Date(activity.start_date_local);
  
  const { week, sessionNumber } = calculateWeekAndSessionNumber(
    activityDate,
    existingSessions
  );

  return {
    date: activityDate.toISOString().split('T')[0],
    week,
    sessionNumber,
    sessionType: '',
    duration,
    distance,
    avgPace,
    avgHeartRate: activity.average_heartrate || 0,
    comments: activity.name || '',
  };
}
