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

export interface PayloadStreamFields {
  hasPolyline: boolean;
  manual: boolean;
  externalIdFieldNull: boolean | null;
  uploadIdFieldNull: boolean | null;
}

/**
 * Heuristic used to avoid proposing streams enrichment for activities that are
 * known to be manual/non-GPS on Strava (usually streamless).
 */
export function isLikelyStreamlessFromFields(fields: PayloadStreamFields): boolean {
  if (fields.manual) return true;
  const explicitNoUploadReference =
    fields.externalIdFieldNull === true && fields.uploadIdFieldNull === true;
  return explicitNoUploadReference && !fields.hasPolyline;
}

export function isStravaActivityLikelyStreamless(payload: unknown): boolean {
  if (!isRecord(payload)) return false;

  const fieldNull = (key: string): boolean | null =>
    Object.prototype.hasOwnProperty.call(payload, key) ? payload[key] == null : null;

  return isLikelyStreamlessFromFields({
    hasPolyline: hasPolyline(payload),
    manual: payload.manual === true,
    externalIdFieldNull: fieldNull('external_id'),
    uploadIdFieldNull: fieldNull('upload_id'),
  });
}
