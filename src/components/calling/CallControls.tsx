import React from 'react';
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff } from 'lucide-react';

interface CallControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoOn,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall
}) => {
  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm">
      {/* Microphone Toggle */}
      <button
        type="button"
        onClick={onToggleMute}
        className={`p-3 rounded-xl font-bold transition-all cursor-pointer ${
          isMuted
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
        }`}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
      </button>

      {/* Camera Toggle */}
      <button
        type="button"
        onClick={onToggleVideo}
        className={`p-3 rounded-xl font-bold transition-all cursor-pointer ${
          !isVideoOn
            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
        }`}
        title={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
        aria-label={isVideoOn ? 'Turn Camera Off' : 'Turn Camera On'}
      >
        {isVideoOn ? <Video className="w-5 h-5 text-blue-400" /> : <VideoOff className="w-5 h-5" />}
      </button>

      {/* Screen Share Toggle */}
      <button
        type="button"
        onClick={onToggleScreenShare}
        className={`p-3 rounded-xl font-bold transition-all cursor-pointer ${
          isScreenSharing
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500'
            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
        }`}
        title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        aria-label={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
      >
        <ScreenShare className="w-5 h-5" />
      </button>

      {/* Hang Up Button */}
      <button
        type="button"
        onClick={onEndCall}
        className="p-3 px-4 sm:px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-transform active:scale-95 cursor-pointer"
        title="Leave and End Call"
        aria-label="Leave and End Call"
      >
        <PhoneOff className="w-5 h-5" />
        <span className="text-xs font-bold hidden sm:inline">End Call</span>
      </button>
    </div>
  );
};
