import 'server-only';
export {
  mapWorkoutToSession,
  mapPlanToSession,
} from './session.mapper';

export type {
  ExternalFlags,
  PlanSessionData,
  ExternalActivityData,
  WeatherObservationData,
  WorkoutStreamsV3Data,
  WorkoutBase,
  WorkoutFull,
  PlanSessionFull,
  SessionMapperOptions,
} from './session.mapper';
