import { Schema, model, Document, Model } from 'mongoose';

// OrganizationSettings interface
export interface IOrganizationSettings extends Document {
  organizationPrefix: string; // To identify which organization this belongs to
  lateAttendanceLimit: number; // Minutes after session start time allowed for late marking (default: 30)
  isStrictAttendance: boolean; // If true, users cannot mark attendance after grace period (default: false)
}

// OrganizationSettings schema
const OrganizationSettingsSchema: Schema = new Schema({
  organizationPrefix: {
    type: String,
    required: true,
    unique: true, // One settings record per organization
  },
  lateAttendanceLimit: {
    type: Number,
    required: true,
    default: 30, // Default: 30 minutes
    min: 0, // Cannot be negative
  },
  isStrictAttendance: {
    type: Boolean,
    required: true,
    default: false, // Default: false (non-strict mode)
  },
}, { timestamps: true });

// Index for faster lookups by organizationPrefix
OrganizationSettingsSchema.index({ organizationPrefix: 1 });

// Factory function to create OrganizationSettings model
// Note: This is a shared collection, not organization-specific
const createOrganizationSettingsModel = (): Model<IOrganizationSettings> => {
  return model<IOrganizationSettings>('OrganizationSettings', OrganizationSettingsSchema);
};

export default createOrganizationSettingsModel;

