import 'server-only';
export {
  mapWorkoutToSession,
  mapPlannedWorkoutToSession,
} from './session.mapper';

export type {
  ExternalFlags,
  PlannedWorkoutData,
  WorkoutIntervalData,
  WorkoutSourceData,
  WeatherObservationData,
  WorkoutStreamsData,
  WorkoutBase,
  WorkoutFull,
  SessionMapperOptions,
} from './session.mapper';
