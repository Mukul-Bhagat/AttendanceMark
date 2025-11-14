// Session interface matching the backend model
export interface ISession {
  _id: string;
  name: string;
  description?: string;
  frequency: 'OneTime' | 'Daily' | 'Weekly' | 'Monthly';
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  locationType: 'Physical' | 'Virtual' | 'Hybrid';
  physicalLocation?: string;
  virtualLocation?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
  assignedUsers: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
  weeklyDays?: string[];
  createdBy: string;
  organizationPrefix: string;
  createdAt: string;
  updatedAt: string;
}

// My Attendance Record interface (attendance with populated session)
export interface IMyAttendanceRecord {
  _id: string;
  userId: string;
  sessionId: ISession | null; // Full session object or null if session was deleted
  checkInTime: string; // ISO date string
  locationVerified: boolean;
  userLocation: {
    latitude: number;
    longitude: number;
  };
  deviceId: string;
  createdAt: string;
  updatedAt: string;
}

