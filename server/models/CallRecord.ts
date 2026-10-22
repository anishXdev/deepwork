import mongoose, { Schema, Document, Model } from 'mongoose';

export type CallStatus =
  | 'pending'
  | 'ringing'
  | 'active'
  | 'rejected'
  | 'cancelled'
  | 'ended'
  | 'missed'
  | 'busy';

export type CallMediaType = 'audio' | 'video';

export interface IParticipant {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  color?: string;
}

export interface ICallRecord extends Document {
  callId: string;
  roomName: string;
  boardId: string;
  boardName: string;
  callType: CallMediaType;
  status: CallStatus;
  caller: IParticipant;
  recipient: IParticipant;
  targetEmails: string[];
  targetMemberIds: string[];
  startedAt: Date;
  acceptedAt?: Date;
  endedAt?: Date;
  durationSeconds: number;
  rejectionReason?: string;
  livekitUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantSchema = new Schema<IParticipant>(
  {
    id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    color: { type: String, default: '#0C66E4' }
  },
  { _id: false }
);

const CallRecordSchema = new Schema<ICallRecord>(
  {
    callId: { type: String, required: true, unique: true, index: true },
    roomName: { type: String, required: true, unique: true, index: true },
    boardId: { type: String, required: true, index: true },
    boardName: { type: String, default: 'Deepwork Workspace' },
    callType: { type: String, enum: ['audio', 'video'], default: 'video' },
    status: {
      type: String,
      enum: ['pending', 'ringing', 'active', 'rejected', 'cancelled', 'ended', 'missed', 'busy'],
      default: 'ringing',
      index: true
    },
    caller: { type: ParticipantSchema, required: true },
    recipient: { type: ParticipantSchema, required: true },
    targetEmails: [{ type: String, lowercase: true, trim: true }],
    targetMemberIds: [{ type: String }],
    startedAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    rejectionReason: { type: String },
    livekitUrl: { type: String }
  },
  {
    timestamps: true
  }
);

// Helpful compound indexes for queries
CallRecordSchema.index({ 'caller.email': 1, status: 1 });
CallRecordSchema.index({ 'recipient.email': 1, status: 1 });
CallRecordSchema.index({ boardId: 1, createdAt: -1 });

// Avoid OverwriteModelError in HMR / multiple imports
export const CallRecord: Model<ICallRecord> =
  mongoose.models.CallRecord || mongoose.model<ICallRecord>('CallRecord', CallRecordSchema);
