import 'server-only';
export {
  getIntervalsActivities,
  getIntervalsActivityStreams,
  isIntervalsConfigured,
  type IntervalsActivity,
  type IntervalsStream,
} from './client';
export {
  mapIntervalsActivityToSessionPayload,
  buildPolylineFromStreams,
  encodePolyline,
  mapStreamsToStravaShape,
  IMPORTABLE_TYPES,
  INTERVALS_SOURCE,
} from './mapper';
