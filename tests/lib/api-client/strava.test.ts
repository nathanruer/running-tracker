import { describe, it, expect, vi, beforeEach } from 'vitest';
import { disconnectStrava } from '@/lib/services/api-client/auth';
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
});