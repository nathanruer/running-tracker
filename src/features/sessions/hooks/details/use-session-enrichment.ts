'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { enrichSessionStreams, enrichSessionWeather, getSessionById } from '@/lib/services/api-client';
import { queryKeys } from '@/lib/constants/query-keys';
import { useErrorHandler } from '@/hooks/use-error-handler';
import type { TrainingSession } from '@/lib/types';

function formatStreamSuccessMessage(streams: TrainingSession['stravaStreams'] | null | undefined): string {
  if (!streams || typeof streams !== 'object') {
    return 'Les streams disponibles ont été ajoutés à votre séance.';
  }

  const labels: string[] = [];
  if ('velocity_smooth' in streams) labels.push('allure');
  if ('altitude' in streams) labels.push('altitude');
  if ('heartrate' in streams) labels.push('fréquence cardiaque');
  if ('cadence' in streams) labels.push('cadence');

  if (labels.length === 0) {
    return 'Les streams disponibles ont été ajoutés à votre séance.';
  }

  if (labels.length === 1) {
    return `Stream ajouté: ${labels[0]}.`;
  }

  const last = labels[labels.length - 1];
  const first = labels.slice(0, -1).join(', ');
  return `Streams ajoutés: ${first} et ${last}.`;
}

interface UseSessionEnrichmentOptions {
  session: TrainingSession | null;
  onSessionUpdated?: (session: TrainingSession) => void;
}

export function useSessionEnrichment({ session, onSessionUpdated }: UseSessionEnrichmentOptions) {
  const [isEnrichingWeather, setIsEnrichingWeather] = useState(false);
  const [isEnrichingStreams, setIsEnrichingStreams] = useState(false);
  const queryClient = useQueryClient();
  const { handleError, handleInfo, handleSuccess } = useErrorHandler({ scope: 'local' });

  const syncUpdatedSession = async (
    sessionId: string,
    resultSession: unknown
  ): Promise<TrainingSession | null> => {
    let updatedSession = (resultSession ?? null) as TrainingSession | null;
    if (!updatedSession || !('userId' in updatedSession)) {
      updatedSession = await queryClient.fetchQuery({
        queryKey: queryKeys.sessionById(sessionId),
        queryFn: () => getSessionById(sessionId),
      });
    }
    if (updatedSession && 'id' in updatedSession) {
      queryClient.setQueryData(queryKeys.sessionById(updatedSession.id), updatedSession);
      onSessionUpdated?.(updatedSession);
    }
    return updatedSession;
  };

  const enrichWeather = async () => {
    if (!session || isEnrichingWeather) return;
    setIsEnrichingWeather(true);
    try {
      const result = await enrichSessionWeather(session.id);
      if (result.status === 'already_has_weather') {
        handleInfo('Météo déjà à jour', 'Cette séance dispose déjà des données météo les plus récentes.');
        return;
      }
      if (result.status === 'enriched' || result.status === 'updated') {
        await syncUpdatedSession(session.id, result.session);
        handleSuccess('Météo récupérée !', 'Les conditions météo ont été ajoutées à votre séance.');
        return;
      }
      handleInfo('Météo non disponible', 'Nous n’avons pas pu récupérer les données météo pour cette séance.');
    } catch (error) {
      handleError(error, 'Impossible de récupérer la météo.');
    } finally {
      setIsEnrichingWeather(false);
    }
  };

  const enrichStreams = async () => {
    if (!session || isEnrichingStreams) return;
    setIsEnrichingStreams(true);
    try {
      const result = await enrichSessionStreams(session.id);
      if (result.status === 'already_has_streams') {
        handleInfo('Streams déjà à jour', 'Cette séance dispose déjà de ses streams Strava.');
        return;
      }
      if (result.status === 'no_streams') {
        await syncUpdatedSession(session.id, result.session);
        handleInfo('Aucun stream disponible', 'Strava ne fournit pas de streams exploitables pour cette activité.');
        return;
      }
      if (result.status === 'enriched') {
        const updatedSession = await syncUpdatedSession(session.id, result.session);
        handleSuccess('Streams récupérés !', formatStreamSuccessMessage(updatedSession?.stravaStreams ?? null));
        return;
      }
      handleInfo('Streams non disponibles', 'Nous n’avons pas pu récupérer les streams Strava pour cette séance.');
    } catch (error) {
      handleError(error, 'Impossible de récupérer les streams Strava.');
    } finally {
      setIsEnrichingStreams(false);
    }
  };

  return { isEnrichingWeather, isEnrichingStreams, enrichWeather, enrichStreams };
}
