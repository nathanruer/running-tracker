export const getWeatherLabel = (code: number): string => {
  if (code === 0) return 'Ensoleillé';
  if (code === 1) return 'Majoritairement clair';
  if (code === 2) return 'Partiellement nuageux';
  if (code === 3) return 'Nuageux';
  if (code >= 45 && code <= 48) return 'Brouillard';
  if (code >= 51 && code <= 55) return 'Bruine';
  if (code >= 61 && code <= 65) return 'Pluie';
  if (code >= 71 && code <= 75) return 'Neige';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code >= 95 && code <= 99) return 'Orage';
  return 'Inconnu';
};
