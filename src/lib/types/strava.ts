export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_temp?: number;
  elev_high?: number;
  elev_low?: number;
  calories?: number;
  map?: {
    id: string;
    summary_polyline: string;
  };
  external_id?: string;
  upload_id?: number;
}

export type StravaStreamType =
  | 'time'
  | 'distance'
  | 'velocity_smooth'
  | 'heartrate'
  | 'cadence'
  | 'altitude'
  | 'grade_smooth';

export interface StravaStream {
  data: number[];
  series_type: 'time' | 'distance';
  original_size: number;
  resolution: 'low' | 'medium' | 'high';
}

export type StravaStreamSet = Partial<Record<StravaStreamType, StravaStream>>;
