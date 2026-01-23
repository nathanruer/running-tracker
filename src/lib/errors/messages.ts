import { ErrorCode } from './types';

export const ERROR_MESSAGES_MAP: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Email ou mot de passe incorrect.',
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Votre session a expiré. Veuillez vous reconnecter.',
  [ErrorCode.AUTH_UNAUTHORIZED]: 'Vous devez être connecté pour accéder à cette ressource.',
  [ErrorCode.AUTH_EMAIL_TAKEN]: 'Cette adresse email est déjà utilisée.',

  [ErrorCode.STRAVA_NOT_CONNECTED]: 'Votre compte Strava n\'est pas connecté.',
  [ErrorCode.STRAVA_TOKEN_EXPIRED]: 'La connexion à Strava a expiré. Veuillez vous reconnecter.',
  [ErrorCode.STRAVA_RATE_LIMITED]: 'Trop de requêtes vers Strava. Veuillez patienter quelques minutes.',
  [ErrorCode.STRAVA_ACCOUNT_ALREADY_LINKED]: 'Ce compte Strava est déjà lié à un autre utilisateur.',
  [ErrorCode.STRAVA_FETCH_FAILED]: 'Impossible de récupérer les données depuis Strava.',
  [ErrorCode.STRAVA_IMPORT_FAILED]: 'L\'import des activités Strava a échoué.',

  [ErrorCode.SESSION_NOT_FOUND]: 'La séance demandée est introuvable.',
  [ErrorCode.SESSION_VALIDATION_FAILED]: 'Les données de la séance sont invalides.',
  [ErrorCode.SESSION_SAVE_FAILED]: 'Impossible de sauvegarder la séance.',
  [ErrorCode.SESSION_DELETE_FAILED]: 'Impossible de supprimer la séance.',

  [ErrorCode.NETWORK_OFFLINE]: 'Vous semblez être hors-ligne. Vérifiez votre connexion.',
  [ErrorCode.NETWORK_TIMEOUT]: 'La requête a pris trop de temps. Veuillez réessayer.',
  [ErrorCode.NETWORK_SERVER_ERROR]: 'Le serveur est momentanément indisponible.',

  [ErrorCode.VALIDATION_FAILED]: 'Les données saisies sont invalides.',

  [ErrorCode.IMPORT_INVALID_FORMAT]: 'Le format du fichier est invalide.',
  [ErrorCode.IMPORT_PARSE_ERROR]: 'Impossible de lire le fichier.',
  [ErrorCode.IMPORT_NO_DATA]: 'Le fichier ne contient aucune donnée à importer.',

  [ErrorCode.UNKNOWN]: 'Une erreur inattendue est survenue.',
};

export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES_MAP[code] ?? ERROR_MESSAGES_MAP[ErrorCode.UNKNOWN];
}

export const BLOCKING_ERROR_TITLES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.AUTH_SESSION_EXPIRED]: 'Session expirée',
};

export function getBlockingErrorTitle(code: ErrorCode): string {
  return BLOCKING_ERROR_TITLES[code] ?? 'Erreur';
}
