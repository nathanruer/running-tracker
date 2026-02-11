import 'server-only';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasPolyline(payload: JsonRecord): boolean {
  if (!isRecord(payload.map)) return false;
  const polyline = payload.map.summary_polyline;
  return typeof polyline === 'string' && polyline.trim().length > 0;
}

export function hasStravaRouteInPayload(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  return hasPolyline(payload);
}

/**
 * Heuristic used to avoid proposing streams enrichment for activities that are
 * known to be manual/non-GPS on Strava (usually streamless).
 */
export function isStravaActivityLikelyStreamless(payload: unknown): boolean {
  if (!isRecord(payload)) return false;

  if (payload.manual === true) {
    return true;
  }

  const hasExternalIdField = Object.prototype.hasOwnProperty.call(payload, 'external_id');
  const hasUploadIdField = Object.prototype.hasOwnProperty.call(payload, 'upload_id');
  const explicitNoUploadReference = hasExternalIdField
    && hasUploadIdField
    && payload.external_id == null
    && payload.upload_id == null;

  return explicitNoUploadReference && !hasPolyline(payload);
}
