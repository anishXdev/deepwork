import { Router, Request, Response } from 'express';
import { verifyAuth } from '../middleware/auth';
import { CallRecord, ICallRecord } from '../models/CallRecord';
import { LivekitService } from '../services/livekitService';

export const callRouter = Router();

// Callback to broadcast real-time signaling events
export type SignalingBroadcaster = (event: string, payload: any) => void;
let globalBroadcaster: SignalingBroadcaster = () => {};

export function setSignalingBroadcaster(broadcaster: SignalingBroadcaster) {
  globalBroadcaster = broadcaster;
}

/**
 * 1. POST /api/calls/initiate
 * Initiate an audio/video call to a specific teammate
 */
callRouter.post('/initiate', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user!;
    const {
      recipientId,
      recipientEmail,
      recipientName,
      recipientAvatar,
      recipientColor,
      boardId,
      boardName,
      callType = 'video'
    } = req.body;

    if (!recipientEmail && !recipientId) {
      res.status(400).json({
        success: false,
        error: 'Recipient email or ID is required to initiate a call.'
      });
      return;
    }

    const normCallerEmail = (caller.email || '').toLowerCase().trim();
    const normRecipientEmail = (recipientEmail || '').toLowerCase().trim();

    if (normCallerEmail && normRecipientEmail && normCallerEmail === normRecipientEmail) {
      res.status(400).json({
        success: false,
        error: 'Cannot initiate a call with yourself.'
      });
      return;
    }

    // Check for existing ringing or active call between these users (prevent duplicate calls)
    const existingCall = await CallRecord.findOne({
      $or: [
        {
          'caller.email': normCallerEmail,
          'recipient.email': normRecipientEmail,
          status: { $in: ['ringing', 'active'] }
        },
        {
          'caller.email': normRecipientEmail,
          'recipient.email': normCallerEmail,
          status: { $in: ['ringing', 'active'] }
        }
      ]
    });

    if (existingCall) {
      if (existingCall.status === 'active') {
        res.status(409).json({
          success: false,
          error: 'User is already engaged in an active call.',
          status: 'busy',
          callId: existingCall.callId
        });
        return;
      }

      // If pending/ringing for more than 45 seconds, mark as missed/stale and allow fresh call
      const ageMs = Date.now() - new Date(existingCall.startedAt).getTime();
      if (ageMs > 45000) {
        existingCall.status = 'missed';
        existingCall.endedAt = new Date();
        await existingCall.save();
      } else {
        res.status(409).json({
          success: false,
          error: 'A call is already ringing for this participant.',
          status: 'ringing',
          callId: existingCall.callId
        });
        return;
      }
    }

    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const callId = `call_${uniqueSuffix}`;
    const roomName = `room_${uniqueSuffix}`;

    const newCall = new CallRecord({
      callId,
      roomName,
      boardId: boardId || 'default_board',
      boardName: boardName || 'Deepwork Board',
      callType: callType === 'audio' ? 'audio' : 'video',
      status: 'ringing',
      caller: {
        id: caller.id,
        email: normCallerEmail,
        name: caller.name,
        avatar: caller.avatar || '',
        color: caller.color || '#0C66E4'
      },
      recipient: {
        id: recipientId || `usr_${normRecipientEmail.replace(/[^a-z0-9]/gi, '_')}`,
        email: normRecipientEmail,
        name: recipientName || 'Teammate',
        avatar: recipientAvatar || '',
        color: recipientColor || '#10B981'
      },
      targetEmails: [normRecipientEmail].filter(Boolean),
      targetMemberIds: [recipientId].filter(Boolean),
      startedAt: new Date(),
      livekitUrl: LivekitService.getLivekitUrl()
    });

    await newCall.save();

    // Generate LiveKit token for the caller
    const token = await LivekitService.generateToken({
      roomName,
      participantIdentity: caller.id,
      participantName: caller.name,
      canPublish: true,
      canSubscribe: true,
      ttl: '30m'
    });

    // Broadcast incoming_call signal via real-time signaling
    globalBroadcaster('incoming_call', {
      callId,
      roomName,
      boardId: newCall.boardId,
      boardName: newCall.boardName,
      callType: newCall.callType,
      callerId: caller.id,
      callerName: caller.name,
      callerEmail: normCallerEmail,
      callerAvatar: caller.avatar || '',
      callerColor: caller.color || '#0C66E4',
      targetEmails: [normRecipientEmail],
      targetMemberIds: [recipientId].filter(Boolean)
    });

    res.status(201).json({
      success: true,
      callId,
      roomName,
      token,
      livekitUrl: LivekitService.getLivekitUrl(),
      call: newCall
    });
  } catch (err: any) {
    console.error('[Calls API] Initiate error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call: ' + (err.message || 'Server error')
    });
  }
});

/**
 * 2. POST /api/calls/:callId/accept
 * Recipient accepts the incoming call
 */
callRouter.post('/:callId/accept', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { callId } = req.params;

    const call = await CallRecord.findOne({ callId });
    if (!call) {
      res.status(404).json({ success: false, error: 'Call not found.' });
      return;
    }

    if (call.status !== 'ringing' && call.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `Cannot accept call that is already ${call.status}.`,
        status: call.status
      });
      return;
    }

    const normUserEmail = (user.email || '').toLowerCase().trim();
    const isRecipient =
      call.recipient.email === normUserEmail ||
      call.recipient.id === user.id ||
      call.targetEmails.includes(normUserEmail);

    if (!isRecipient && call.caller.email !== normUserEmail) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized: You are not an invited participant of this call.'
      });
      return;
    }

    // Update call status to active
    call.status = 'active';
    call.acceptedAt = new Date();
    await call.save();

    // Generate LiveKit token for the accepting participant
    const token = await LivekitService.generateToken({
      roomName: call.roomName,
      participantIdentity: user.id,
      participantName: user.name,
      canPublish: true,
      canSubscribe: true,
      ttl: '30m'
    });

    // Notify caller via real-time signal
    globalBroadcaster('call_accepted', {
      callId: call.callId,
      roomName: call.roomName,
      accepterId: user.id,
      accepterEmail: normUserEmail,
      accepterName: user.name,
      callerEmail: call.caller.email,
      boardId: call.boardId
    });

    res.status(200).json({
      success: true,
      callId: call.callId,
      roomName: call.roomName,
      token,
      livekitUrl: LivekitService.getLivekitUrl(),
      call
    });
  } catch (err: any) {
    console.error('[Calls API] Accept error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to accept call: ' + (err.message || 'Server error')
    });
  }
});

/**
 * 3. POST /api/calls/:callId/reject
 * Recipient declines incoming call
 */
callRouter.post('/:callId/reject', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { callId } = req.params;
    const { reason = 'declined' } = req.body;

    const call = await CallRecord.findOne({ callId });
    if (!call) {
      res.status(404).json({ success: false, error: 'Call not found.' });
      return;
    }

    call.status = 'rejected';
    call.endedAt = new Date();
    call.rejectionReason = reason;
    await call.save();

    globalBroadcaster('call_rejected', {
      callId: call.callId,
      rejecterId: user.id,
      rejecterEmail: user.email,
      rejecterName: user.name,
      callerEmail: call.caller.email,
      reason
    });

    res.status(200).json({
      success: true,
      status: 'rejected'
    });
  } catch (err: any) {
    console.error('[Calls API] Reject error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to decline call: ' + (err.message || 'Server error')
    });
  }
});

/**
 * 4. POST /api/calls/:callId/cancel
 * Caller cancels the ringing call before it is answered
 */
callRouter.post('/:callId/cancel', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { callId } = req.params;

    const call = await CallRecord.findOne({ callId });
    if (!call) {
      res.status(404).json({ success: false, error: 'Call not found.' });
      return;
    }

    call.status = 'cancelled';
    call.endedAt = new Date();
    await call.save();

    globalBroadcaster('call_cancelled', {
      callId: call.callId,
      callerId: user.id,
      recipientEmail: call.recipient.email
    });

    res.status(200).json({
      success: true,
      status: 'cancelled'
    });
  } catch (err: any) {
    console.error('[Calls API] Cancel error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel call: ' + (err.message || 'Server error')
    });
  }
});

/**
 * 5. POST /api/calls/:callId/end
 * Hang up and cleanly conclude an active call
 */
callRouter.post('/:callId/end', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { callId } = req.params;

    const call = await CallRecord.findOne({ callId });
    if (!call) {
      res.status(404).json({ success: false, error: 'Call not found.' });
      return;
    }

    const normUserEmail = (user.email || '').toLowerCase().trim();
    const isParticipant =
      call.caller.email === normUserEmail ||
      call.recipient.email === normUserEmail ||
      call.caller.id === user.id ||
      call.recipient.id === user.id;

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized: Cannot terminate a call you are not participating in.'
      });
      return;
    }

    call.status = 'ended';
    call.endedAt = new Date();
    if (call.acceptedAt) {
      call.durationSeconds = Math.max(
        0,
        Math.floor((call.endedAt.getTime() - new Date(call.acceptedAt).getTime()) / 1000)
      );
    } else {
      call.durationSeconds = 0;
    }

    await call.save();

    // Clean up LiveKit room in the background
    LivekitService.closeRoom(call.roomName).catch(() => {});

    // Notify other participant via real-time signal
    const otherEmail = call.caller.email === normUserEmail ? call.recipient.email : call.caller.email;
    globalBroadcaster('call_ended', {
      callId: call.callId,
      senderId: user.id,
      targetEmail: otherEmail,
      durationSeconds: call.durationSeconds
    });

    res.status(200).json({
      success: true,
      status: 'ended',
      durationSeconds: call.durationSeconds
    });
  } catch (err: any) {
    console.error('[Calls API] End call error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to end call: ' + (err.message || 'Server error')
    });
  }
});

/**
 * 6. GET /api/calls/:callId
 * Retrieve call details and metadata
 */
callRouter.get('/:callId', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { callId } = req.params;

    const call = await CallRecord.findOne({ callId });
    if (!call) {
      res.status(404).json({ success: false, error: 'Call not found.' });
      return;
    }

    const normUserEmail = (user.email || '').toLowerCase().trim();
    const isParticipant =
      call.caller.email === normUserEmail ||
      call.recipient.email === normUserEmail ||
      call.targetEmails.includes(normUserEmail);

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized: You are not authorized to view this call.'
      });
      return;
    }

    res.status(200).json({
      success: true,
      call
    });
  } catch (err: any) {
    console.error('[Calls API] Get call error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call details: ' + (err.message || 'Server error')
    });
  }
});

/**
 * 7. POST /api/calls/token
 * Generate or refresh LiveKit access token for an active call session
 */
callRouter.post('/token', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { callId } = req.body;

    if (!callId) {
      res.status(400).json({ success: false, error: 'callId is required.' });
      return;
    }

    const call = await CallRecord.findOne({ callId });
    if (!call) {
      res.status(404).json({ success: false, error: 'Call not found.' });
      return;
    }

    if (call.status !== 'active' && call.status !== 'ringing') {
      res.status(400).json({
        success: false,
        error: `Cannot generate token for a call that is ${call.status}.`
      });
      return;
    }

    const normUserEmail = (user.email || '').toLowerCase().trim();
    const isParticipant =
      call.caller.email === normUserEmail ||
      call.recipient.email === normUserEmail ||
      call.targetEmails.includes(normUserEmail) ||
      call.caller.id === user.id ||
      call.recipient.id === user.id;

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized: You are not an authorized participant in this room.'
      });
      return;
    }

    const token = await LivekitService.generateToken({
      roomName: call.roomName,
      participantIdentity: user.id,
      participantName: user.name,
      canPublish: true,
      canSubscribe: true,
      ttl: '30m'
    });

    res.status(200).json({
      success: true,
      token,
      roomName: call.roomName,
      livekitUrl: LivekitService.getLivekitUrl()
    });
  } catch (err: any) {
    console.error('[Calls API] Token generation error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate token: ' + (err.message || 'Server error')
    });
  }
});

/**
 * 8. GET /api/calls/active/me
 * Look up active call for current user (used on reconnect / reload)
 */
callRouter.get('/active/me', verifyAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const normUserEmail = (user.email || '').toLowerCase().trim();

    const call = await CallRecord.findOne({
      $or: [
        { 'caller.email': normUserEmail },
        { 'recipient.email': normUserEmail },
        { targetEmails: normUserEmail }
      ],
      status: { $in: ['ringing', 'active'] }
    }).sort({ startedAt: -1 });

    if (!call) {
      res.status(200).json({ success: true, activeCall: null });
      return;
    }

    res.status(200).json({
      success: true,
      activeCall: call
    });
  } catch (err: any) {
    console.error('[Calls API] Active call check error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to check active call: ' + (err.message || 'Server error')
    });
  }
});
