export interface Session {
  date: string;
  sessionType: string;
  avgPace: string;
  avgHeartRate: number;
  duration: string;
  distance: number;
  perceivedExertion?: number;
  comments?: string;
  intervalStructure?: string;
}

export interface UserProfile {
  maxHeartRate?: number;
  vma?: number;
  age?: number;
  goal?: string;
}

export interface BuildContextParams {
  currentWeekSessions: Session[];
  allSessions: Session[];
  userProfile: UserProfile;
  nextSessionNumber?: number;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  recommendations?: any;
  createdAt: Date;
}
