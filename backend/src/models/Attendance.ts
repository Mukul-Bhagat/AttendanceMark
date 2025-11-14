import { Schema, model, Document, Model, Types } from 'mongoose';

// Interface for an Attendance document
export interface IAttendance extends Document {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  checkInTime: Date;
  locationVerified: boolean;
  userLocation: {
    latitude: number;
    longitude: number;
  };
  deviceId: string; // The device ID used for *this* scan
}

const AttendanceSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true },
  checkInTime: { type: Date, default: Date.now },
  locationVerified: { type: Boolean, default: false },
  userLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  // We log the device ID used for this specific attendance
  deviceId: { type: String, required: true },
}, { timestamps: true });

// The factory function
const createAttendanceModel = (collectionName: string): Model<IAttendance> => {
  return model<IAttendance>(collectionName, AttendanceSchema, collectionName);
};

export default createAttendanceModel;

