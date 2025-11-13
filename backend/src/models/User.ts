import { Schema, model, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// This is the INTERFACE for a user
export interface IUser extends Document {
  email: string;
  password?: string;
  role: 'SuperAdmin' | 'CompanyAdmin' | 'Manager' | 'EndUser';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  mustResetPassword: boolean;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// This is the User SCHEMA (the structure)
const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false, // Don't return password on queries
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'CompanyAdmin', 'Manager', 'EndUser'],
    required: true,
  },
  profile: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
  },
  mustResetPassword: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

// *** THIS IS THE IMPORTANT PART ***
// This is not a model. It is a FACTORY that creates a model
// for a specific organization's collection.
const createUserModel = (collectionName: string): Model<IUser> => {
  return model<IUser>(collectionName, UserSchema, collectionName);
};

export default createUserModel;

