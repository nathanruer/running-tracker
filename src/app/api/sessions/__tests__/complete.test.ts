import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../[id]/complete/route';
import { prisma } from '@/lib/database';
import { getUserIdFromRequest } from '@/lib/auth';
import { findSessionByIdAndUser } from '@/lib/utils/api';
import { recalculateSessionNumbers } from '@/lib/domain/sessions';

vi.mock('@/lib/database', () => ({
  prisma: {
    training_sessions: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getUserIdFromRequest: vi.fn(),
}));

vi.mock('@/lib/utils/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils/api')>();
  return {
    ...actual,
    findSessionByIdAndUser: vi.fn(),
  };
});

vi.mock('@/lib/domain/sessions', () => ({
  recalculateSessionNumbers: vi.fn(),
}));

vi.mock('@/lib/infrastructure/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('/api/sessions/[id]/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH', () => {
    it('should complete planned session successfully', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
        sessionType: 'Footing',
      };

      const completionData = {
        date: '2025-12-27T10:00:00.000Z',
        duration: '01:00:00',
        distance: '10.5',
        avgPace: '05:43',
        avgHeartRate: '150',
        perceivedExertion: '7',
        comments: 'Good run',
      };

      const completedSession = {
        ...plannedSession,
        status: 'completed',
        date: completionData.date,
        duration: completionData.duration,
        distance: 10.5,
        avgPace: completionData.avgPace,
        avgHeartRate: 150,
        perceivedExertion: 7,
        comments: completionData.comments,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(completedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(completedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(completedSession);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          status: 'completed',
          date: new Date(completionData.date),
          duration: completionData.duration,
          distance: 10.5,
          avgPace: completionData.avgPace,
          avgHeartRate: 150,
          perceivedExertion: 7,
          comments: completionData.comments,
        }),
      });
      expect(recalculateSessionNumbers).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Non authentifié' });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should return 404 when session not found', async () => {
      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Séance non trouvée' });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should return 400 when session is not planned', async () => {
      const completedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'completed',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(completedSession as never);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({
          date: '2025-12-27T10:00:00.000Z',
          duration: '01:00:00',
          distance: '10',
          avgPace: '06:00',
          avgHeartRate: '150',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Cette séance n'est pas planifiée" });
      expect(prisma.training_sessions.update).not.toHaveBeenCalled();
    });

    it('should handle missing perceivedExertion', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
      };

      const completionData = {
        date: '2025-12-27T10:00:00.000Z',
        duration: '01:00:00',
        distance: '10',
        avgPace: '06:00',
        avgHeartRate: '150',
      };

      const completedSession = {
        ...plannedSession,
        status: 'completed',
        perceivedExertion: 0,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(completedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(completedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          perceivedExertion: 0,
        }),
      });
    });

    it('should parse numeric fields correctly', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
      };

      const completionData = {
        date: '2025-12-27T10:00:00.000Z',
        duration: '01:00:00',
        distance: '10.75',
        avgPace: '05:30',
        avgHeartRate: '165',
        perceivedExertion: '8',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({} as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue({} as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });

      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          distance: 10.75,
          avgHeartRate: 165,
          perceivedExertion: 8,
        }),
      });
    });

    it('should refresh session after recalculation', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
      };

      const updatedSession = {
        ...plannedSession,
        status: 'completed',
        sessionNumber: 5,
      };

      const refreshedSession = {
        ...updatedSession,
        sessionNumber: 10,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(updatedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(refreshedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify({
          date: '2025-12-27T10:00:00.000Z',
          duration: '01:00:00',
          distance: '10',
          avgPace: '06:00',
          avgHeartRate: '150',
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      const data = await response.json();

      expect(data).toEqual(refreshedSession);
      expect(prisma.training_sessions.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });

    it('should save Strava import data when completing session with Strava activity', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
        sessionType: 'Footing',
      };

      const stravaData = {
        id: 16913359219,
        name: 'Morning Run',
        distance: 3858.3,
        moving_time: 1643,
        total_elevation_gain: 9,
        elev_high: 40.1,
        elev_low: 33.9,
        average_cadence: 76.6,
        average_temp: 12,
        calories: 317,
        map: {
          id: 'a16913359219',
          summary_polyline: 'kbjiHgywLHOEO?OPOJOASM',
        },
      };

      const completionData = {
        date: '2026-01-02T10:00:00.000Z',
        duration: '00:27:23',
        distance: '3.86',
        avgPace: '07:06',
        avgHeartRate: '153',
        perceivedExertion: '5',
        comments: 'Course à pied dans l\'après-midi',
        externalId: '16913359219',
        source: 'strava',
        stravaData: stravaData,
        elevationGain: 9,
        averageCadence: 76.6,
        averageTemp: 12,
        calories: 317,
      };

      const completedSession = {
        ...plannedSession,
        status: 'completed',
        ...completionData,
        distance: 3.86,
        avgHeartRate: 153,
        perceivedExertion: 5,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue(completedSession as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue(completedSession as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.training_sessions.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: expect.objectContaining({
          status: 'completed',
          externalId: '16913359219',
          source: 'strava',
          stravaData: stravaData,
          elevationGain: 9,
          averageCadence: 76.6,
          averageTemp: 12,
          calories: 317,
        }),
      });
    });

    it('should not include undefined Strava fields when completing without Strava import', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
        sessionType: 'Footing',
      };

      const completionData = {
        date: '2025-12-27T10:00:00.000Z',
        duration: '01:00:00',
        distance: '10.5',
        avgPace: '05:43',
        avgHeartRate: '150',
        perceivedExertion: '7',
        comments: 'Manual entry',
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({} as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue({} as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });

      const updateCall = vi.mocked(prisma.training_sessions.update).mock.calls[0][0];
      expect(updateCall.data.externalId).toBeUndefined();
      expect(updateCall.data.source).toBeUndefined();
      expect(updateCall.data.stravaData).toBeUndefined();
      expect(updateCall.data.elevationGain).toBeUndefined();
    });

    it('should save intervalDetails when completing a fractionné session with CSV import', async () => {
      const plannedSession = {
        id: 'session-123',
        userId: 'user-123',
        status: 'planned',
        sessionType: 'Fractionné',
        intervalDetails: {
          workoutType: 'SEUIL',
          repetitionCount: 3,
          effortDuration: '08:00',
          recoveryDuration: '02:00',
          targetEffortPace: '5:07',
          targetEffortHR: 182,
          targetRecoveryPace: '7:30',
          steps: [
            { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: 1.33, pace: '7:30', hr: 152 },
            { stepNumber: 2, stepType: 'effort', duration: '08:00', distance: 1.56, pace: '5:07', hr: 182 },
            { stepNumber: 3, stepType: 'recovery', duration: '02:00', distance: 0.27, pace: '7:30', hr: 152 },
            { stepNumber: 4, stepType: 'effort', duration: '08:00', distance: 1.56, pace: '5:07', hr: 182 },
            { stepNumber: 5, stepType: 'recovery', duration: '02:00', distance: 0.27, pace: '7:30', hr: 152 },
            { stepNumber: 6, stepType: 'effort', duration: '08:00', distance: 1.56, pace: '5:07', hr: 182 },
            { stepNumber: 7, stepType: 'cooldown', duration: '05:00', distance: 0.68, pace: '7:20', hr: 150 },
          ],
        },
      };

      const updatedIntervalDetails = {
        workoutType: 'SEUIL',
        repetitionCount: 3,
        effortDuration: '08:00',
        recoveryDuration: '02:00',
        targetEffortPace: '5:07',
        targetEffortHR: 182,
        targetRecoveryPace: '7:30',
        steps: [
          { stepNumber: 1, stepType: 'warmup', duration: '13:10', distance: 1.92, pace: '6:51', hr: 141 },
          { stepNumber: 2, stepType: 'effort', duration: '08:00', distance: 1.59, pace: '5:01', hr: 164 },
          { stepNumber: 3, stepType: 'recovery', duration: '02:00', distance: 0.27, pace: '7:30', hr: 158 },
          { stepNumber: 4, stepType: 'effort', duration: '08:00', distance: 1.60, pace: '5:00', hr: 168 },
          { stepNumber: 5, stepType: 'recovery', duration: '02:00', distance: 0.27, pace: '7:28', hr: 162 },
          { stepNumber: 6, stepType: 'effort', duration: '08:00', distance: 1.65, pace: '4:50', hr: 169 },
          { stepNumber: 7, stepType: 'cooldown', duration: '05:11', distance: 0.77, pace: '6:46', hr: 157 },
        ],
      };

      const completionData = {
        date: '2026-01-07T10:00:00.000Z',
        duration: '00:46:22',
        distance: '8.07',
        avgPace: '05:45',
        avgHeartRate: '157',
        perceivedExertion: '7',
        comments: 'Course à pied dans l\'après-midi',
        intervalDetails: updatedIntervalDetails,
      };

      vi.mocked(getUserIdFromRequest).mockReturnValue('user-123');
      vi.mocked(findSessionByIdAndUser).mockResolvedValue(plannedSession as never);
      vi.mocked(prisma.training_sessions.update).mockResolvedValue({} as never);
      vi.mocked(prisma.training_sessions.findUnique).mockResolvedValue({} as never);
      vi.mocked(recalculateSessionNumbers).mockResolvedValue(true);

      const request = new NextRequest('http://localhost/api/sessions/session-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(completionData),
      });

      await PATCH(request, { params: Promise.resolve({ id: 'session-123' }) });

      const updateCall = vi.mocked(prisma.training_sessions.update).mock.calls[0][0];
      expect(updateCall.data.intervalDetails).toEqual(updatedIntervalDetails);
    });
  });
});
