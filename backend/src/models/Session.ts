import { Schema, model, Document, Model } from 'mongoose';

// Session interface
export interface ISession extends Document {
  name: string;
  description?: string;
  frequency: 'OneTime' | 'Daily' | 'Weekly' | 'Monthly';
  startDate: Date;
  endDate?: Date;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  locationType: 'Physical' | 'Virtual' | 'Hybrid';
  physicalLocation?: string;
  virtualLocation?: string; // URL for virtual meetings
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // Radius in meters for geolocation check
  assignedUsers: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  }>;
  weeklyDays?: string[]; // For Weekly frequency: ['Monday', 'Tuesday', etc.]
  sessionAdmin?: string; // User ID of the SessionAdmin assigned to this session
  createdBy: string; // User ID who created the session
  organizationPrefix: string; // To identify which organization this belongs to
}

// Session schema
const SessionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  frequency: {
    type: String,
    enum: ['OneTime', 'Daily', 'Weekly', 'Monthly'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
  },
  locationType: {
    type: String,
    enum: ['Physical', 'Virtual', 'Hybrid'],
    required: true,
  },
  physicalLocation: {
    type: String,
  },
  virtualLocation: {
    type: String,
  },
  geolocation: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  radius: {
    type: Number, // Radius in meters
    default: 100, // Default 100 meters
  },
  assignedUsers: [{
    userId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
  }],
  weeklyDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  }],
  sessionAdmin: {
    type: String, // User ID of the SessionAdmin
  },
  createdBy: {
    type: String,
    required: true,
  },
  organizationPrefix: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Factory function to create Session model for a specific organization
const createSessionModel = (collectionName: string): Model<ISession> => {
  return model<ISession>(collectionName, SessionSchema, collectionName);
};

export default createSessionModel;

