// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  GENERIC: 'Une erreur est survenue',
  INTERNAL_SERVER: 'Erreur interne du serveur',
  INVALID_PAYLOAD: 'Payload invalide',
  UNAUTHORIZED: 'Non authentifié',
  FORBIDDEN: 'Accès interdit',
  NOT_FOUND: 'Resource non trouvée',

  JWT_NOT_CONFIGURED: "JWT_SECRET n'est pas configuré",
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect',
  EMAIL_ALREADY_USED: 'Email déjà utilisé',

  AI_JSON_NOT_FOUND: 'JSON non trouvé dans la réponse IA',
  GROQ_API_KEY_MISSING: 'Clé API Groq manquante',

  STRAVA_FETCH_FAILED: 'Échec de la récupération',
  STRAVA_NO_ACTIVITIES: "Aucune activité n'a pu être récupérée depuis Strava",
  STRAVA_IMPORT_ERROR: "Impossible d'importer les activités",
  STRAVA_TOKEN_EXCHANGE_FAILED: 'Failed to exchange code for tokens',
  STRAVA_REFRESH_FAILED: 'Failed to refresh access token',
  STRAVA_ACTIVITIES_FAILED: 'Failed to fetch activities',
  STRAVA_ACTIVITY_DETAILS_FAILED: 'Failed to fetch activity details',
  STRAVA_CONFIG_MISSING: 'Configuration Strava manquante',

  SESSIONS_ARRAY_REQUIRED: 'Le tableau de séances est requis',
  IDS_ARRAY_REQUIRED: "Le tableau d'identifiants est requis",

  FORM_FIELD_ERROR: 'useFormField should be used within <FormField>',

  ENV_VARS_MISSING: "Variables d'environnement manquantes ou invalides.",

  MIN_DATE_RANGE: "La plage doit être d'au moins 2 semaines (14 jours)",
  NO_SESSIONS_SELECTED: 'Aucune séance sélectionnée',

  IMPORT_ERROR: "Erreur lors de l'import",
  CSV_IMPORT_ERROR: 'Erreur lors de l\'import CSV',
} as const;

// ============================================================================
// VALIDATION MESSAGES (for Zod schemas)
// ============================================================================

import { HEART_RATE, RPE } from './validation';

export const VALIDATION_MESSAGES = {
  DURATION_FORMAT: 'Format: MM:SS ou HH:MM:SS',
  PACE_FORMAT: 'Format: MM:SS ou HH:MM:SS',
  
  DURATION_REQUIRED: 'Durée requise',
  PACE_REQUIRED: 'Allure requise',
  DISTANCE_REQUIRED: 'Distance requise',
  NUMBER_REQUIRED: 'Nombre requis',
  SESSION_TYPE_REQUIRED: 'Type de séance requis',
  DATE_REQUIRED: 'Date requise',
  STEP_NUMBER_REQUIRED: 'Numéro de step requis',
  
  DISTANCE_POSITIVE: 'Distance doit être positive',
  HR_POSITIVE: 'FC doit être positive',
  HR_MAX: `FC max ${HEART_RATE.MAX} bpm`,
  RPE_RANGE: `Entre ${RPE.MIN} et ${RPE.MAX}`,
  RPE_POSITIVE: 'RPE doit être positive',
  RPE_MAX: `RPE max ${RPE.MAX}`,
  REPETITION_MIN: 'Au moins 1 répétition',
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
  STRAVA_CONNECTED: 'Votre compte Strava a été connecté avec succès!',
  STRAVA_DISCONNECTED: 'Votre compte Strava a été déconnecté avec succès',

  SESSION_CREATED: 'Séance créée',
  SESSION_CREATED_DESC: 'La séance a été créée avec succès.',
  SESSION_UPDATED: 'Séance mise à jour',
  SESSION_UPDATED_DESC: 'La séance a été mise à jour avec succès.',
  SESSION_DELETED: 'Séance supprimée',
  SESSION_DELETED_DESC: 'La séance a été supprimée avec succès.',
  SESSIONS_DELETED_TITLE: 'Séances supprimées',

  PROFILE_UPDATED: 'Profil mis à jour',
  PROFILE_UPDATED_DESC: 'Votre profil a été mis à jour avec succès.',

  IMPORT_SUCCESS: 'Import réussi',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getBulkDeleteMessage = (count: number): string => {
  return `${count} séance${count > 1 ? 's' : ''} ${count > 1 ? 'ont' : 'a'} été supprimée${count > 1 ? 's' : ''} avec succès.`;
};

export const getImportSuccessMessage = (count: number): string => {
  const s = count > 1 ? 's' : '';
  return `${count} séance${s} importée${s} avec succès.`;
};
