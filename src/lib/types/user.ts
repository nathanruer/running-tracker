export interface User {
  id: string;
  email: string;
  weight?: number | null;
  age?: number | null;
  maxHeartRate?: number | null;
  vma?: number | null;
  goal?: string | null;
  stravaId?: string | null;
  stravaTokenExpiresAt?: Date | null;
}

export interface UserUpdatePayload {
  email?: string;
  password?: string;
  weight?: number;
  age?: number;
  maxHeartRate?: number;
  vma?: number;
  goal?: string;
}
