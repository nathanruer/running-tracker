import { describe, it, expect } from 'vitest';
import {
  mapWorkoutToSession,
  mapPlanToSession,
  type WorkoutBase,
  type WorkoutFull,
  type PlanSessionFull,
} from '../session.mapper';

// ============================================================================
// Test fixtures
// ============================================================================

const createWorkoutBase = (overrides: Partial<WorkoutBase> = {}): WorkoutBase => ({
  id: 'workout-1',
  userId: 'user-1',
  planSessionId: null,
  startedAt: new Date('2024-01-15T10:00:00Z'),
  timezone: 'Europe/Paris',
  datePrecision: 'instant',
  status: 'completed',
  sessionNumber: 5,
  week: 2,
  sessionType: 'Endurance',
  comments: 'Great run!',
  perceivedExertion: 7,
  durationS: 3600,
  distanceM: 10000,
  paceSKm: 360,
  avgHr: 145,
  maxHr: 172,
  avgCadence: 170,
  elevationGainM: 120,
  calories: 650,
  routePolyline: null,
  plan_sessions: null,
  ...overrides,
});

const createWorkoutFull = (overrides: Partial<WorkoutFull> = {}): WorkoutFull => ({
  ...createWorkoutBase(),
  external_activities: [
    {
      source: 'strava',
      externalId: 'strava-123',
      rawPayload: { name: 'Morning Run', type: 'Run' },
    },
  ],
  weather_observations: {
    observedAt: new Date('2024-01-15T10:00:00Z'),
    temperature: 15,
    apparentTemperature: 14,
    humidity: 60,
    windSpeed: 10,
    precipitation: 0,
    conditionCode: 800,
    payload: null,
  },
  workout_streams_v3: {
    time: null,
    distance: null,
    velocity: null,
    altitude: null,
    heartrate: [140, 145, 150],
    cadence: null,
  },
  ...overrides,
});

const createPlanSession = (overrides: Partial<PlanSessionFull> = {}): PlanSessionFull => ({
  id: 'plan-1',
  userId: 'user-1',
  sessionNumber: 10,
  week: 3,
  plannedDate: new Date('2024-01-20T08:00:00Z'),
  sessionType: 'Interval',
  status: 'planned',
  targetDuration: 45,
  targetDistance: 8,
  targetPace: '05:30',
  targetHeartRateBpm: '160',
  targetRPE: 8,
  intervalDetails: { warmup: 10, intervals: 5 },
  recommendationId: 'rec-1',
  comments: 'Speed work',
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('session.mapper', () => {
  describe('mapWorkoutToSession', () => {
    describe('with full data (default)', () => {
      it('should map basic workout fields correctly', () => {
        const workout = createWorkoutFull();
        const session = mapWorkoutToSession(workout);

        expect(session.id).toBe('workout-1');
        expect(session.userId).toBe('user-1');
        expect(session.sessionNumber).toBe(5);
        expect(session.week).toBe(2);
        expect(session.date).toBe('2024-01-15T10:00:00.000Z');
        expect(session.startedAt).toBe('2024-01-15T10:00:00.000Z');
        expect(session.timezone).toBe('Europe/Paris');
        expect(session.datePrecision).toBe('instant');
        expect(session.localDate).toBe('2024-01-15');
        expect(session.sessionType).toBe('Endurance');
        expect(session.comments).toBe('Great run!');
        expect(session.status).toBe('completed');
        expect(session.perceivedExertion).toBe(7);
      });

      it('should expose the civil day in the workout timezone for day precision', () => {
        const workout = createWorkoutFull({
          startedAt: new Date('2024-01-14T23:00:00Z'),
          datePrecision: 'day',
        });
        const session = mapWorkoutToSession(workout);

        expect(session.date).toBe('2024-01-14T23:00:00.000Z');
        expect(session.datePrecision).toBe('day');
        expect(session.localDate).toBe('2024-01-15');
      });

      it('should map metrics correctly', () => {
        const workout = createWorkoutFull();
        const session = mapWorkoutToSession(workout);

        expect(session.duration).toBe('01:00:00');
        expect(session.distance).toBe(10);
        expect(session.avgPace).toBe('06:00');
        expect(session.avgHeartRate).toBe(145);
        expect(session.maxHeartRate).toBe(172);
        expect(session.averageCadence).toBe(170);
        expect(session.elevationGain).toBe(120);
        expect(session.calories).toBe(650);
      });

      it('should expose the route polyline column', () => {
        const workout = createWorkoutFull({ routePolyline: 'abc' });
        const session = mapWorkoutToSession(workout);

        expect(session.routePolyline).toBe('abc');
      });

      it('should map external activity data', () => {
        const workout = createWorkoutFull();
        const session = mapWorkoutToSession(workout);

        expect(session.externalId).toBe('strava-123');
        expect(session.source).toBe('strava');
        expect(session.stravaData).toEqual({ name: 'Morning Run', type: 'Run' });
      });

      it('should map weather data', () => {
        const workout = createWorkoutFull();
        const session = mapWorkoutToSession(workout);

        expect(session.weather).not.toBeNull();
        expect(session.weather?.temperature).toBe(15);
        expect(session.weather?.humidity).toBe(60);
        expect(session.weather?.conditionCode).toBe(800);
        expect(session.averageTemp).toBe(15);
      });

      it('should map streams columns back to the strava-shaped set', () => {
        const workout = createWorkoutFull({
          workout_streams_v3: {
            time: [0, 1, 2],
            distance: null,
            velocity: [3, 3.1, 3.2],
            altitude: null,
            heartrate: [140, 145, 150],
            cadence: null,
          },
        });
        const session = mapWorkoutToSession(workout);

        expect(session.stravaStreams).toEqual({
          time: { data: [0, 1, 2] },
          velocity_smooth: { data: [3, 3.1, 3.2] },
          heartrate: { data: [140, 145, 150] },
        });
        expect(session.hasStreams).toBe(true);
      });

      it('should flag streams as handled when sourceStatus is no_streams', () => {
        const workout = createWorkoutFull({
          workout_streams_v3: null,
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'no_streams',
              rawPayload: null,
            },
          ],
        });
        const session = mapWorkoutToSession(workout);

        expect(session.stravaStreams).toBeNull();
        expect(session.hasStreams).toBe(true);
      });

      it('should flag streams as handled when the enrichment status is not_applicable', () => {
        const workout = createWorkoutFull({
          workout_streams_v3: null,
          external_activities: [
            {
              source: 'intervals_icu',
              externalId: 'i-1',
              sourceStatus: 'imported',
              rawPayload: { id: 1, external_id: 'garmin', upload_id: 12 },
              streamsStatus: 'not_applicable',
            },
          ],
        });
        const session = mapWorkoutToSession(workout);

        expect(session.hasStreams).toBe(true);
      });

      it('should flag streams as handled for manual/streamless Strava payload', () => {
        const workout = createWorkoutFull({
          workout_streams_v3: null,
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: {
                external_id: null,
                upload_id: null,
              },
            },
          ],
        });
        const session = mapWorkoutToSession(workout);

        expect(session.stravaStreams).toBeNull();
        expect(session.hasStreams).toBe(true);
      });

      it('should prefer strava activity over others', () => {
        const workout = createWorkoutFull({
          external_activities: [
            { source: 'garmin', externalId: 'garmin-1', rawPayload: null },
            { source: 'strava', externalId: 'strava-1', rawPayload: null },
          ],
        });
        const session = mapWorkoutToSession(workout);

        expect(session.source).toBe('strava');
        expect(session.externalId).toBe('strava-1');
      });

      it('should use first activity when no strava', () => {
        const workout = createWorkoutFull({
          external_activities: [
            { source: 'garmin', externalId: 'garmin-1', rawPayload: null },
          ],
        });
        const session = mapWorkoutToSession(workout);

        expect(session.source).toBe('garmin');
        expect(session.externalId).toBe('garmin-1');
      });
    });

    describe('with table view (includeFullData: false)', () => {
      it('should include core data', () => {
        const workout = createWorkoutFull();
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.id).toBe('workout-1');
        expect(session.sessionType).toBe('Endurance');
        expect(session.duration).toBe('01:00:00');
        expect(session.distance).toBe(10);
      });

      it('should include lightweight external reference without full payload', () => {
        const workout = createWorkoutFull();
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.externalId).toBe('strava-123');
        expect(session.source).toBe('strava');
        expect(session.stravaData).toBeNull();
        expect(session.stravaStreams).toBeNull();
        expect(session.weather).toBeNull();
        expect(session.averageTemp).toBeNull();
      });

      it('should keep hasWeather false when route exists but weather is missing', () => {
        const workout = createWorkoutFull({
          weather_observations: null,
          routePolyline: 'abc123',
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: {
                map: { id: 'map-1', summary_polyline: 'abc123' },
              },
            },
          ],
        });
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasWeather).toBe(false);
      });

      it('should report hasWeather false when no weather is stored, even without a route', () => {
        const workout = createWorkoutFull({
          weather_observations: null,
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: {
                map: { id: 'map-1', summary_polyline: null },
              },
            },
          ],
        });
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasWeather).toBe(false);
      });

      it('should expose hasStreams from the external activity flag in table view', () => {
        const workout = createWorkoutFull({
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: { id: 1, external_id: 'garmin', upload_id: 12 },
              hasStreams: true,
            },
          ],
        });
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasStreams).toBe(true);
      });

      it('should report hasStreams false when nothing is stored nor known unavailable', () => {
        const workout = createWorkoutFull({
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: { id: 1, external_id: 'garmin', upload_id: 12 },
              hasStreams: false,
              streamsStatus: 'pending',
            },
          ],
        });
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasStreams).toBe(false);
      });

      it('should expose hasStreams when external activity is marked no_streams', () => {
        const workout = createWorkoutFull({
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'no_streams',
              rawPayload: null,
            },
          ],
        });
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasStreams).toBe(true);
      });

      it('should expose hasStreams when Strava payload is missing in table view', () => {
        const workout = createWorkoutFull({
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: null,
            },
          ],
        });
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasStreams).toBe(true);
      });

      it('should expose hasStreams for manual/streamless Strava payload in table view', () => {
        const workout = createWorkoutFull({
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: {
                external_id: null,
                upload_id: null,
              },
            },
          ],
        });
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasStreams).toBe(true);
      });

      it('should compute hasStreams from SQL flags when provided', () => {
        const workout = createWorkoutBase();
        const flags = {
          source: 'intervals_icu',
          externalId: 'i-1',
          sourceStatus: 'imported',
          hasPayload: true,
          hasPolyline: true,
          manual: false,
          externalIdFieldNull: false,
          uploadIdFieldNull: false,
          hasStreams: false,
          streamsStatus: 'pending',
        };

        expect(mapWorkoutToSession(workout, { includeFullData: false, externalFlags: flags }).hasStreams).toBe(false);
        expect(
          mapWorkoutToSession(workout, { includeFullData: false, externalFlags: { ...flags, hasStreams: true } }).hasStreams
        ).toBe(true);
        expect(
          mapWorkoutToSession(workout, {
            includeFullData: false,
            externalFlags: { ...flags, streamsStatus: 'not_applicable' },
          }).hasStreams
        ).toBe(true);
        expect(mapWorkoutToSession(workout, { includeFullData: false, externalFlags: null }).hasStreams).toBe(false);
      });
    });

    describe('with export view (includeFullData: false, includeWeather: true)', () => {
      it('should include weather data with lightweight external reference', () => {
        const workout = createWorkoutFull();
        const session = mapWorkoutToSession(workout, { includeFullData: false, includeWeather: true });

        expect(session.externalId).toBe('strava-123');
        expect(session.source).toBe('strava');
        expect(session.stravaData).toBeNull();
        expect(session.stravaStreams).toBeNull();
        expect(session.weather).not.toBeNull();
        expect(session.weather?.temperature).toBe(15);
        expect(session.averageTemp).toBe(15);
      });
    });

    describe('with base workout (no full relations)', () => {
      it('should handle missing external data gracefully', () => {
        const workout = createWorkoutBase();
        const session = mapWorkoutToSession(workout);

        expect(session.externalId).toBeNull();
        expect(session.source).toBeNull();
        expect(session.stravaData).toBeNull();
        expect(session.stravaStreams).toBeNull();
        expect(session.weather).toBeNull();
      });

      it('should leave hasStreams undefined in table view when external data was not loaded', () => {
        const workout = createWorkoutBase();
        const session = mapWorkoutToSession(workout, { includeFullData: false });

        expect(session.hasStreams).toBeUndefined();
      });
    });

    describe('with plan session data', () => {
      it('should use plan session type when workout has none', () => {
        const workout = createWorkoutFull({
          sessionType: null,
          plan_sessions: {
            plannedDate: null,
            sessionType: 'Recovery',
            targetDuration: 30,
            targetDistance: null,
            targetPace: null,
            targetHeartRateBpm: null,
            targetRPE: null,
            intervalDetails: null,
            recommendationId: null,
            comments: '',
          },
        });
        const session = mapWorkoutToSession(workout);

        expect(session.sessionType).toBe('Recovery');
      });

      it('should map target fields from plan', () => {
        const workout = createWorkoutFull({
          plan_sessions: {
            plannedDate: new Date('2024-01-15'),
            sessionType: 'Tempo',
            targetDuration: 40,
            targetDistance: 10,
            targetPace: '05:30',
            targetHeartRateBpm: '155',
            targetRPE: 7,
            intervalDetails: { sets: 3 },
            recommendationId: 'rec-123',
            comments: 'Plan comment',
          },
        });
        const session = mapWorkoutToSession(workout);

        expect(session.targetDuration).toBe(40);
        expect(session.targetDistance).toBe(10);
        expect(session.targetPace).toBe('05:30');
        expect(session.targetHeartRateBpm).toBe('155');
        expect(session.targetRPE).toBe(7);
        expect(session.intervalDetails).toEqual({ sets: 3 });
        expect(session.recommendationId).toBe('rec-123');
        expect(session.plannedDate).toBe('2024-01-15T00:00:00.000Z');
      });
    });

    describe('edge cases', () => {
      it('should handle null metrics', () => {
        const workout = createWorkoutFull({
          durationS: null,
          distanceM: null,
          paceSKm: null,
          avgHr: null,
        });
        const session = mapWorkoutToSession(workout);

        expect(session.duration).toBeNull();
        expect(session.distance).toBeNull();
        expect(session.avgPace).toBeNull();
        expect(session.avgHeartRate).toBeNull();
      });

      it('should handle partially null metrics', () => {
        const workout = createWorkoutFull({
          durationS: 1800,
          distanceM: null,
          paceSKm: null,
          avgHr: 130,
        });
        const session = mapWorkoutToSession(workout);

        expect(session.duration).toBe('30:00'); // Smart format: MM:SS for < 1h
        expect(session.distance).toBeNull();
        expect(session.avgHeartRate).toBe(130);
      });

      it('should handle empty external activities', () => {
        const workout = createWorkoutFull({
          external_activities: [],
        });
        const session = mapWorkoutToSession(workout);

        expect(session.externalId).toBeNull();
        expect(session.source).toBeNull();
      });

      it('should handle empty streams', () => {
        const workout = createWorkoutFull({
          workout_streams_v3: null,
          external_activities: [
            {
              source: 'strava',
              externalId: 'strava-123',
              sourceStatus: 'imported',
              rawPayload: { id: 1, external_id: 'garmin', upload_id: 12 },
              hasStreams: false,
              streamsStatus: 'pending',
            },
          ],
        });
        const session = mapWorkoutToSession(workout);

        expect(session.stravaStreams).toBeNull();
        expect(session.hasStreams).toBe(false);
      });

      it('should handle null weather', () => {
        const workout = createWorkoutFull({
          weather_observations: null,
        });
        const session = mapWorkoutToSession(workout);

        expect(session.weather).toBeNull();
        expect(session.averageTemp).toBeNull();
      });

      it('should default sessionNumber to 0 when null', () => {
        const workout = createWorkoutFull({ sessionNumber: null });
        const session = mapWorkoutToSession(workout);

        expect(session.sessionNumber).toBe(0);
      });
    });
  });

  describe('mapPlanToSession', () => {
    it('should map basic plan fields', () => {
      const plan = createPlanSession();
      const session = mapPlanToSession(plan);

      expect(session.id).toBe('plan-1');
      expect(session.userId).toBe('user-1');
      expect(session.sessionNumber).toBe(10);
      expect(session.week).toBe(3);
      expect(session.sessionType).toBe('Interval');
      expect(session.status).toBe('planned');
      expect(session.comments).toBe('Speed work');
    });

    it('should map target fields', () => {
      const plan = createPlanSession();
      const session = mapPlanToSession(plan);

      expect(session.targetDuration).toBe(45);
      expect(session.targetDistance).toBe(8);
      expect(session.targetPace).toBe('05:30');
      expect(session.targetHeartRateBpm).toBe('160');
      expect(session.targetRPE).toBe(8);
      expect(session.intervalDetails).toEqual({ warmup: 10, intervals: 5 });
      expect(session.recommendationId).toBe('rec-1');
    });

    it('should set null date by default', () => {
      const plan = createPlanSession();
      const session = mapPlanToSession(plan);

      expect(session.date).toBeNull();
      expect(session.plannedDate).toBe('2024-01-20T08:00:00.000Z');
    });

    it('should use plannedDate as date when option is true', () => {
      const plan = createPlanSession();
      const session = mapPlanToSession(plan, { includePlannedDateAsDate: true });

      expect(session.date).toBe('2024-01-20T08:00:00.000Z');
    });

    it('should set workout-specific fields to null', () => {
      const plan = createPlanSession();
      const session = mapPlanToSession(plan);

      expect(session.duration).toBeNull();
      expect(session.distance).toBeNull();
      expect(session.avgPace).toBeNull();
      expect(session.avgHeartRate).toBeNull();
      expect(session.perceivedExertion).toBeNull();
      expect(session.externalId).toBeNull();
      expect(session.source).toBeNull();
      expect(session.stravaData).toBeNull();
      expect(session.stravaStreams).toBeNull();
      expect(session.weather).toBeNull();
    });

    it('should handle null plannedDate', () => {
      const plan = createPlanSession({ plannedDate: null });
      const session = mapPlanToSession(plan);

      expect(session.plannedDate).toBeNull();
      expect(session.date).toBeNull();
    });

    it('should handle null plannedDate with includePlannedDateAsDate', () => {
      const plan = createPlanSession({ plannedDate: null });
      const session = mapPlanToSession(plan, { includePlannedDateAsDate: true });

      expect(session.date).toBeNull();
    });

    it('should default sessionNumber to 0 when null', () => {
      const plan = createPlanSession({ sessionNumber: null });
      const session = mapPlanToSession(plan);

      expect(session.sessionNumber).toBe(0);
    });

    it('should handle empty comments', () => {
      const plan = createPlanSession({ comments: '' });
      const session = mapPlanToSession(plan);

      expect(session.comments).toBe('');
    });
  });
});
