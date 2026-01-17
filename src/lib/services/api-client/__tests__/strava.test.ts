import { describe, it, expect, vi, beforeEach } from 'vitest';
import { disconnectStrava } from '@/lib/services/api-client/auth';
import {
  getStravaActivities,
  getStravaActivityDetails,
} from '@/lib/services/api-client/strava';
import * as clientModule from '@/lib/services/api-client/client';

vi.mock('@/lib/services/api-client/client', () => ({
  apiRequest: vi.fn(),
}));

describe('Strava API', () => {
  const mockApiRequest = vi.mocked(clientModule.apiRequest);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('disconnectStrava', () => {
    it('should disconnect Strava account successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Compte Strava déconnecté avec succès'
      };
      mockApiRequest.mockResolvedValue(mockResponse);

      const result = await disconnectStrava();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/auth/strava/disconnect', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle unauthorized error', async () => {
      mockApiRequest.mockRejectedValue({
        status: 401,
        message: 'Non autorisé'
      });

      await expect(disconnectStrava()).rejects.toThrow('Non autorisé');
    });

    it('should handle user not found error', async () => {
      mockApiRequest.mockRejectedValue({
        status: 404,
        message: 'Utilisateur non trouvé'
      });

      await expect(disconnectStrava()).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should handle no Strava account linked error', async () => {
      mockApiRequest.mockRejectedValue({
        status: 400,
        message: 'Aucun compte Strava n\'est actuellement lié'
      });

      await expect(disconnectStrava()).rejects.toThrow('Aucun compte Strava n\'est actuellement lié');
    });

    it('should handle server errors', async () => {
      mockApiRequest.mockRejectedValue({
        status: 500,
        message: 'Une erreur est survenue lors de la déconnexion de Strava'
      });

      await expect(disconnectStrava()).rejects.toThrow('Une erreur est survenue lors de la déconnexion de Strava');
    });
  });

  describe('getStravaActivities', () => {
    it('fetches all formatted Strava activities', async () => {
      const mockActivities = [
        {
          date: '2024-01-15',
          sessionType: '',
          duration: '01:00:00',
          distance: 10,
          avgPace: '06:00',
          avgHeartRate: 145,
          comments: 'Morning Run',
          externalId: '12345678',
          source: 'strava',
        },
        {
          date: '2024-01-15',
          sessionType: '',
          duration: '00:30:00',
          distance: 5,
          avgPace: '06:00',
          avgHeartRate: 135,
          comments: 'Evening Jog',
          externalId: '87654321',
          source: 'strava',
        },
      ];
      mockApiRequest.mockResolvedValue({ activities: mockActivities });

      const result = await getStravaActivities();

      expect(mockApiRequest).toHaveBeenCalledWith('/api/strava/activities?page=1&per_page=20');
      expect(result.activities).toEqual(mockActivities);
    });

    it('returns empty array when no activities', async () => {
      mockApiRequest.mockResolvedValue({ activities: [] });

      const result = await getStravaActivities();

      expect(result.activities).toEqual([]);
    });

    it('fetches activities with pagination', async () => {
      const mockActivities = [
        {
          date: '2024-01-15',
          sessionType: '',
          duration: '01:00:00',
          distance: 10,
          avgPace: '06:00',
          avgHeartRate: 145,
          comments: 'Morning Run',
          externalId: '12345678',
          source: 'strava',
        },
      ];
      mockApiRequest.mockResolvedValue({ activities: mockActivities, hasMore: true });

      const result = await getStravaActivities(2);

      expect(mockApiRequest).toHaveBeenCalledWith('/api/strava/activities?page=2&per_page=20');
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getStravaActivityDetails', () => {
    it('fetches details for a specific activity', async () => {
      const mockDetails = {
        id: '12345678',
        date: '2024-01-15',
        sessionType: 'Footing',
        duration: '01:00:00',
        distance: 10,
        avgPace: '06:00',
        avgHeartRate: 145,
        comments: 'Morning Run',
      };
      mockApiRequest.mockResolvedValue(mockDetails);

      const result = await getStravaActivityDetails('12345678');

      expect(mockApiRequest).toHaveBeenCalledWith('/api/strava/activities/12345678');
      expect(result).toEqual(mockDetails);
    });

    it('fetches activity with interval details', async () => {
      const mockDetails = {
        id: '12345678',
        date: '2024-01-15',
        sessionType: 'Fractionné',
        duration: '00:45:00',
        distance: 8,
        avgPace: '05:30',
        avgHeartRate: 160,
        comments: 'Interval Training',
        intervalDetails: {
          repetitionCount: 8,
          effortDuration: '03:00',
          recoveryDuration: '01:30',
        },
      };
      mockApiRequest.mockResolvedValue(mockDetails);

      const result = await getStravaActivityDetails('12345678');

      expect(result.intervalDetails).toBeDefined();
    });
  });
});
