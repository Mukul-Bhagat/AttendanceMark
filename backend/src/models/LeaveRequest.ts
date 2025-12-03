import { Schema, model, Document, Model, Types } from 'mongoose';

// LeaveRequest interface
export interface ILeaveRequest extends Document {
  userId: Types.ObjectId;
  leaveType: 'Personal' | 'Casual' | 'Sick' | 'Extra';
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: Types.ObjectId;
  rejectionReason?: string;
  organizationPrefix: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// LeaveRequest schema
const LeaveRequestSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  leaveType: {
    type: String,
    enum: ['Personal', 'Casual', 'Sick', 'Extra'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  daysCount: {
    type: Number,
    required: true,
    min: 0.5, // Allow half days
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectionReason: {
    type: String,
    trim: true,
  },
  organizationPrefix: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Index for faster lookups
LeaveRequestSchema.index({ userId: 1, organizationPrefix: 1 });
LeaveRequestSchema.index({ organizationPrefix: 1, status: 1 });
LeaveRequestSchema.index({ startDate: 1, endDate: 1 });

// Factory function to create LeaveRequest model for a specific organization
const createLeaveRequestModel = (collectionName: string): Model<ILeaveRequest> => {
  return model<ILeaveRequest>(collectionName, LeaveRequestSchema, collectionName);
};

export default createLeaveRequestModel;

