import 'server-only';
export {
  mapWorkoutToSession,
  mapPlannedWorkoutToSession,
} from './session.mapper';

export type {
  ExternalFlags,
  PlannedWorkoutData,
  WorkoutIntervalData,
  ExternalActivityData,
  WeatherObservationData,
  WorkoutStreamsV3Data,
  WorkoutBase,
  WorkoutFull,
  SessionMapperOptions,
} from './session.mapper';
