
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CameraIcon } from './icons/CameraIcon';
import { BrainIcon } from './icons/BrainIcon';
import { ExclamationIcon } from './icons/ExclamationIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { XIcon } from './icons/XIcon';
import { BellIcon } from './icons/BellIcon';
import { CognitiveModel } from './cognitiveModel';
import type { Participant, MeetingEvent } from '../types';

type PlatformView = 'landing' | 'host-setup' | 'join-login' | 'room';

interface MeetingPlatformProps {
  onBack: () => void;
}

// Icons for controls
const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
    </svg>
);
const MicOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12.733l-4.518 2.375a1 1 0 01-1.45-1.054V4.733l1.223-.656a1 1 0 01.128-.001zm1.334 0L14.94 5.39a1 1 0 01.53 1.348l-1.332 3.86a1 1 0 01-1.34.626L10 10.733V3.076z" clipRule="evenodd" />
        <line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);
const VideoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
    </svg>
);
const VideoOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
);

// Helper for CSV escaping
const escapeCSV = (str: string | undefined | null) => {
    if (!str) return '""';
    return `"${str.toString().replace(/"/g, '""')}"`;
};

// WebRTC Configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

// Types for Signaling Messages
type SignalMessage = 
  | { type: 'join'; senderId: string; user: { id: string; name: string; role: string } }
  | { type: 'offer'; targetId: string; senderId: string; sdp: RTCSessionDescriptionInit; user: { id: string; name: string; role: string } }
  | { type: 'answer'; targetId: string; senderId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; targetId: string; senderId: string; candidate: RTCIceCandidateInit }
  | { type: 'leave'; senderId: string }
  | { type: 'check-meeting'; senderId: string }
  | { type: 'meeting-alive'; senderId: string }
  | { type: 'admin-action'; senderId: string; targetId: string; action: 'toggle-audio' | 'toggle-video' }
  | { type: 'participant-update'; senderId: string; updates: Partial<Participant> };

const generateMeetingCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface VideoTileProps {
    participant: Participant;
    amIHost: boolean;
    onAdminAction: (id: string, action: 'toggle-audio' | 'toggle-video') => void;
}

// Video Tile Component to handle stream attachment effectively
const VideoTile: React.FC<VideoTileProps> = ({ participant, amIHost, onAdminAction }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && participant.stream && participant.status !== 'kicked') {
            videoRef.current.srcObject = participant.stream;
        } else if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, [participant.stream, participant.status]);

    return (
        <div className={`relative bg-gray-900 rounded-xl overflow-hidden border-2 transition-all w-full h-full group ${participant.status === 'kicked' ? 'border-red-900 opacity-50 grayscale' : participant.metrics.stress > 80 ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : participant.metrics.attention < 30 ? 'border-yellow-500' : 'border-gray-800'}`}>
            {/* Host Controls Overlay */}
            {amIHost && !participant.isLocal && participant.status !== 'kicked' && (
                <div className="absolute top-2 left-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onAdminAction(participant.id, 'toggle-audio')}
                        className={`p-1.5 rounded-full ${participant.hasAudio ? 'bg-gray-700/80 hover:bg-red-600' : 'bg-red-600 hover:bg-gray-700'} text-white transition-colors backdrop-blur`}
                        title={participant.hasAudio ? "Mute Participant" : "Unmute Participant"}
                    >
                        {participant.hasAudio ? <MicIcon /> : <MicOffIcon />}
                    </button>
                    <button 
                        onClick={() => onAdminAction(participant.id, 'toggle-video')}
                        className={`p-1.5 rounded-full ${participant.hasVideo ? 'bg-gray-700/80 hover:bg-red-600' : 'bg-red-600 hover:bg-gray-700'} text-white transition-colors backdrop-blur`}
                        title={participant.hasVideo ? "Disable Video" : "Enable Video"}
                    >
                        {participant.hasVideo ? <VideoIcon /> : <VideoOffIcon />}
                    </button>
                </div>
            )}

            {/* Video Layer */}
            {participant.status === 'kicked' ? (
                 <div className="w-full h-full bg-black flex flex-col items-center justify-center">
                    <div className="p-4 bg-red-900/30 rounded-full mb-3">
                         <XIcon />
                    </div>
                    <p className="text-red-500 font-bold tracking-widest">REMOVED BY AI</p>
                    <p className="text-gray-600 text-xs mt-1">Connection Terminated</p>
                </div>
            ) : participant.hasVideo ? (
                <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted={participant.isLocal} // Mute local audio to prevent feedback
                    className="w-full h-full object-cover transform scale-x-[-1]"
                />
            ) : (
                <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500 mb-2">
                        {participant.name.charAt(0)}
                    </div>
                    <p className="text-gray-500 text-sm">Video Off</p>
                </div>
            )}
            
            {/* Name Tag */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-white text-sm font-medium flex items-center gap-2 z-10 max-w-[80%] truncate">
                <span className="truncate">{participant.name}</span> <span className="text-gray-400 text-xs hidden sm:inline">({participant.role})</span>
                {!participant.hasAudio && participant.status !== 'kicked' && <span className="text-red-400 text-xs shrink-0 flex items-center gap-1"><MicOffIcon /> MUTED</span>}
                {participant.isLocal && <span className="text-cyan-400 text-xs font-bold shrink-0">YOU</span>}
            </div>

            {/* AI HUD Overlay (Only if active) */}
            {participant.status === 'active' && (
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur p-2 rounded-lg w-28 md:w-32 space-y-1.5 border border-white/10 z-10 scale-90 md:scale-100 origin-top-right">
                    <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Attn</span>
                            <span>{Math.round(participant.metrics.attention)}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${participant.metrics.attention}%` }}></div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Stress</span>
                            <span>{Math.round(participant.metrics.stress)}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${participant.metrics.stress > 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${participant.metrics.stress}%` }}></div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Curiosity</span>
                            <span>{Math.round(participant.metrics.curiosity)}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-400 transition-all duration-1000" style={{ width: `${participant.metrics.curiosity}%` }}></div>
                        </div>
                    </div>
                    
                    {participant.metrics.postureScore > 50 && (
                        <div className="mt-1 text-[9px] bg-red-500 text-white text-center rounded py-0.5 font-bold animate-pulse">
                            WARNING: POSTURE
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const MeetingPlatform: React.FC<MeetingPlatformProps> = ({ onBack }) => {
  const [view, setView] = useState<PlatformView>('landing');
  const [meetingCode, setMeetingCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<MeetingEvent[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [meetingStartTime, setMeetingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  
  // WebRTC Refs
  const signalingRef = useRef<BroadcastChannel | null>(null);
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const myIdRef = useRef<string>('');
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Remote AI Simulation Refs
  const remoteModelsRef = useRef<{ [id: string]: CognitiveModel }>({});
  
  // Ref for tracking tracking counters that don't need UI updates every tick
  const participantTrackingRef = useRef<{ 
      [id: string]: { 
          badPostureSeconds: number; 
          toxicCount: number;
          highStressSeconds: number;
          lowAttentionSeconds: number;
          inappropriateFlag: boolean; // true if nudity/inappropriate, false if just slouching
      } 
  }>({});
  
  // Queue for events generated during state updates to avoid side-effects in render
  const eventsQueue = useRef<MeetingEvent[]>([]);

  const eventLogRef = useRef<HTMLDivElement>(null);

  // Determine if amIHost
  const amIHost = participants.find(p => p.isLocal)?.isHost ?? false;
  // Determine local user state for footer controls
  const localParticipant = participants.find(p => p.isLocal);

  // Sync ref with state
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Initialize Local Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: 'user' }, 
        audio: true 
      });
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error("Camera error:", err);
      let msg = "Could not access camera.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Permission denied. Please allow camera/microphone access in your browser settings.";
      } else if (err.name === 'NotFoundError') {
        msg = "No camera or microphone found.";
      }
      setCameraError(msg);
      // Return null but allow meeting to proceed
      return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (signalingRef.current) {
          signalingRef.current.close();
      }
      Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, []); // eslint-disable-line

  const addEvent = (type: MeetingEvent['type'], message: string, targetUser?: string) => {
    const newEvent: MeetingEvent = {
      id: Date.now(),
      timestamp: Date.now(),
      type,
      message,
      targetUser
    };
    setEvents(prev => [newEvent, ...prev]);
  };
  
  // Flush events from the queue (used by the interval loop)
  useEffect(() => {
      if (eventsQueue.current.length > 0) {
          const newEvents = [...eventsQueue.current];
          eventsQueue.current = [];
          setEvents(prev => [...newEvents.reverse(), ...prev]);
      }
  });

  // Timer Effect
  useEffect(() => {
    if (view === 'room' && meetingStartTime) {
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.floor((now - meetingStartTime) / 1000);
            const hours = Math.floor(diff / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;
            
            const fmt = (n: number) => n.toString().padStart(2, '0');
            setElapsedTime(`${hours > 0 ? fmt(hours) + ':' : ''}${fmt(minutes)}:${fmt(seconds)}`);
        }, 1000);
        return () => clearInterval(interval);
    }
  }, [view, meetingStartTime]);

  // --- WebRTC Logic ---

  const createPeerConnection = (targetId: string, targetName: string, targetRole: string) => {
      if (peersRef.current[targetId]) return peersRef.current[targetId];

      const pc = new RTCPeerConnection(rtcConfig);
      peersRef.current[targetId] = pc;

      // Add local tracks
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
          if (event.candidate && signalingRef.current) {
              signalingRef.current.postMessage({
                  type: 'ice-candidate',
                  targetId,
                  senderId: myIdRef.current,
                  candidate: event.candidate
              } as SignalMessage);
          }
      };

      // Handle Remote Stream
      pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          setParticipants(prev => {
              if (prev.some(p => p.id === targetId)) {
                  // Update existing participant with stream if missing
                  return prev.map(p => p.id === targetId ? { ...p, stream: remoteStream, status: 'active' } : p);
              }
              // Add new participant
              return [...prev, {
                  id: targetId,
                  name: targetName,
                  role: targetRole,
                  isHost: false,
                  isLocal: false,
                  hasVideo: true,
                  hasAudio: true,
                  status: 'active',
                  stream: remoteStream,
                  metrics: { attention: 50, stress: 30, curiosity: 50, postureScore: 0 }
              }];
          });
      };

      pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              handleLeave(targetId);
          }
      };

      return pc;
  };

  const initiateConnection = async (targetId: string, targetName: string, targetRole: string) => {
      const pc = createPeerConnection(targetId, targetName, targetRole);
      
      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (signalingRef.current) {
          signalingRef.current.postMessage({
              type: 'offer',
              targetId,
              senderId: myIdRef.current,
              sdp: offer,
              user: { id: myIdRef.current, name: userName || 'Host', role: userRole || 'Host' }
          } as SignalMessage);
      }
  };

  const handleOffer = async (senderId: string, sdp: RTCSessionDescriptionInit, senderUser: {name: string, role: string}) => {
      const pc = createPeerConnection(senderId, senderUser.name, senderUser.role);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalingRef.current) {
          signalingRef.current.postMessage({
              type: 'answer',
              targetId: senderId,
              senderId: myIdRef.current,
              sdp: answer
          } as SignalMessage);
      }
  };

  const handleAnswer = async (senderId: string, sdp: RTCSessionDescriptionInit) => {
      const pc = peersRef.current[senderId];
      if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
  };

  const handleCandidate = async (senderId: string, candidate: RTCIceCandidateInit) => {
      const pc = peersRef.current[senderId];
      if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
  };

  const handleLeave = (senderId: string) => {
      if (peersRef.current[senderId]) {
          peersRef.current[senderId].close();
          delete peersRef.current[senderId];
      }
      setParticipants(prev => {
          const user = prev.find(p => p.id === senderId);
          if (user) {
              addEvent('leave', `${user.name} left the meeting.`, user.name);
          }
          return prev.filter(p => p.id !== senderId);
      });
  };

  // Initialize Room & Signaling
  useEffect(() => {
    // We want the signaling to open if we are in the room, regardless of camera state
    // This fixes the "Meeting not found" error if host denies camera
    if (view !== 'room' || !meetingCode) return;
    
    // Set my identity
    const myUser = participants.find(p => p.isLocal);
    if (!myUser) return;
    myIdRef.current = myUser.id;

    // Use BroadcastChannel for tab-to-tab communication (simulates signaling server)
    const channelName = `neuro-meet-${meetingCode}`;
    const channel = new BroadcastChannel(channelName);
    signalingRef.current = channel;

    console.log(`Connected to signaling channel: ${channelName}`);

    channel.onmessage = async (event) => {
        const msg = event.data as SignalMessage;
        
        // Ignore own messages
        if (msg.senderId === myIdRef.current) return;
        
        // Use 'in' check to narrow type and safely access targetId
        if ('targetId' in msg && msg.targetId && msg.targetId !== myIdRef.current) return;

        switch (msg.type) {
            case 'join':
                addEvent('join', `${msg.user.name} joined the room.`, msg.user.name);
                // Existing peers initiate connection to new joiner
                initiateConnection(msg.user.id, msg.user.name, msg.user.role);
                break;
            case 'offer':
                handleOffer(msg.senderId, msg.sdp, msg.user);
                break;
            case 'answer':
                handleAnswer(msg.senderId, msg.sdp);
                break;
            case 'ice-candidate':
                handleCandidate(msg.senderId, msg.candidate);
                break;
            case 'leave':
                handleLeave(msg.senderId);
                break;
            case 'check-meeting':
                channel.postMessage({ type: 'meeting-alive', senderId: myIdRef.current } as SignalMessage);
                break;
            case 'admin-action':
                // Handle host controls
                if (msg.targetId === myIdRef.current && localStreamRef.current) {
                    if (msg.action === 'toggle-audio') {
                        localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
                        const hasAudio = localStreamRef.current.getAudioTracks().some(t => t.enabled);
                        setParticipants(prev => prev.map(p => p.isLocal ? { ...p, hasAudio } : p));
                        channel.postMessage({ type: 'participant-update', senderId: myIdRef.current, updates: { hasAudio } } as SignalMessage);
                        addEvent('warning', hasAudio ? 'Host enabled your microphone.' : 'Host disabled your microphone.', 'You');
                    } else if (msg.action === 'toggle-video') {
                        localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
                        const hasVideo = localStreamRef.current.getVideoTracks().some(t => t.enabled);
                        setParticipants(prev => prev.map(p => p.isLocal ? { ...p, hasVideo } : p));
                        channel.postMessage({ type: 'participant-update', senderId: myIdRef.current, updates: { hasVideo } } as SignalMessage);
                        addEvent('warning', hasVideo ? 'Host enabled your camera.' : 'Host disabled your camera.', 'You');
                    }
                }
                break;
            case 'participant-update':
                setParticipants(prev => prev.map(p => p.id === msg.senderId ? { ...p, ...msg.updates } : p));
                break;
        }
    };

    // Announce entry
    setTimeout(() => {
        channel.postMessage({ 
            type: 'join', 
            senderId: myIdRef.current, 
            user: { id: myIdRef.current, name: myUser.name, role: myUser.role } 
        } as SignalMessage);
    }, 1000);

    return () => {
        channel.postMessage({ type: 'leave', senderId: myIdRef.current } as SignalMessage);
        channel.close();
    };
  }, [view, meetingCode]); // Removed localStream to ensure channel stays open


  // --- App Flow Handlers ---

  const handleHostStart = async () => {
    const code = generateMeetingCode();
    setMeetingCode(code);
    setHasConsented(false);
    setView('host-setup');
  };

  const confirmHostMeeting = async () => {
    // Attempt to start camera, but proceed even if it fails
    const stream = await startCamera();
    
    const hostUser: Participant = {
      id: `host-${Date.now()}`,
      name: 'You (Host)',
      role: 'Host',
      isHost: true,
      isLocal: true,
      hasVideo: !!stream,
      hasAudio: !!stream,
      status: 'active',
      stream: stream || undefined,
      metrics: { attention: 85, stress: 20, curiosity: 75, postureScore: 0 }
    };
    
    setParticipants([hostUser]);
    setMeetingStartTime(Date.now());
    addEvent('join', 'Meeting started by Host.', 'Host');
    setView('room');
  };

  const handleJoinStart = () => {
    setJoinError(null);
    setJoinCode('');
    setHasConsented(false);
    setView('join-login');
  };

  const confirmJoinMeeting = async () => {
    if (joinCode.length !== 5) {
      setJoinError("Please enter a valid 5-character code.");
      return;
    }
    if (!userName || !userRole) {
      setJoinError("Please enter your name and role.");
      return;
    }

    setIsValidating(true);
    setJoinError(null);

    // Validate Code by pinging the room channel
    const isValid = await new Promise<boolean>((resolve) => {
        const tempChannel = new BroadcastChannel(`neuro-meet-${joinCode}`);
        let resolved = false;

        const cleanup = () => {
            resolved = true;
            clearInterval(pingInterval);
            clearTimeout(timeout);
            tempChannel.close();
        };

        tempChannel.onmessage = (e) => {
            const msg = e.data as SignalMessage;
            if (msg.type === 'meeting-alive') {
                cleanup();
                resolve(true);
            }
        };

        // Send check multiple times to ensure delivery (retry logic)
        const pingInterval = setInterval(() => {
             tempChannel.postMessage({ type: 'check-meeting', senderId: 'temp-validator' } as SignalMessage);
        }, 500);

        // Timeout after 3 seconds
        const timeout = setTimeout(() => {
            if (!resolved) {
                cleanup();
                resolve(false);
            }
        }, 3000); 
    });

    setIsValidating(false);

    if (!isValid) {
        setJoinError("Meeting code not found or meeting is inactive.");
        return;
    }

    // Code is valid, proceed
    setMeetingCode(joinCode);
    const stream = await startCamera();

    const joinerUser: Participant = {
      id: `joiner-${Date.now()}`,
      name: `${userName} (You)`,
      role: userRole,
      isHost: false,
      isLocal: true,
      hasVideo: !!stream,
      hasAudio: !!stream,
      status: 'active',
      stream: stream || undefined,
      metrics: { attention: 80, stress: 30, curiosity: 60, postureScore: 0 }
    };

    setParticipants([joinerUser]);
    setMeetingStartTime(Date.now());
    addEvent('join', `You joined the meeting.`, userName);
    setView('room');
  };

  // Admin Control Handler
  const handleAdminAction = (targetId: string, action: 'toggle-audio' | 'toggle-video') => {
    if (!amIHost) return;

    // Check if simulated bot
    if (targetId.startsWith('bot-')) {
        setParticipants(prev => prev.map(p => {
            if (p.id !== targetId) return p;
            let updated = { ...p };
            if (action === 'toggle-audio') updated.hasAudio = !updated.hasAudio;
            if (action === 'toggle-video') updated.hasVideo = !updated.hasVideo;
            
            // Add event for log
            const type = (action === 'toggle-audio' ? updated.hasAudio : updated.hasVideo) ? 'warning' : 'warning';
            const feature = action === 'toggle-audio' ? 'microphone' : 'camera';
            const status = (action === 'toggle-audio' ? updated.hasAudio : updated.hasVideo) ? 'enabled' : 'disabled';
            addEvent('warning', `Host ${status} ${p.name}'s ${feature}.`, p.name);
            
            return updated;
        }));
        return;
    }

    // Real user - Send Signal
    if (signalingRef.current) {
        signalingRef.current.postMessage({
            type: 'admin-action',
            senderId: myIdRef.current,
            targetId: targetId,
            action: action
        } as SignalMessage);
    }
  };

  // Local Controls
  const toggleLocalAudio = () => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const enabled = !audioTracks[0].enabled;
    audioTracks.forEach(t => t.enabled = enabled);

    setParticipants(prev => prev.map(p => p.isLocal ? { ...p, hasAudio: enabled } : p));
    
    // Notify others
    if (signalingRef.current) {
        signalingRef.current.postMessage({
            type: 'participant-update',
            senderId: myIdRef.current,
            updates: { hasAudio: enabled }
        } as SignalMessage);
    }
  };

  const toggleLocalVideo = () => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) return;

    const enabled = !videoTracks[0].enabled;
    videoTracks.forEach(t => t.enabled = enabled);

    setParticipants(prev => prev.map(p => p.isLocal ? { ...p, hasVideo: enabled } : p));
    
    // Notify others
    if (signalingRef.current) {
        signalingRef.current.postMessage({
            type: 'participant-update',
            senderId: myIdRef.current,
            updates: { hasVideo: enabled }
        } as SignalMessage);
    }
  };


  // Manual Bot Simulation
  const addSimulatedBot = () => {
     const id = `bot-${Date.now()}`;
     const names = ['AI Agent', 'Dr. Sim', 'Test Bot', 'Jane Doe', 'Dev Bot'];
     const name = names[Math.floor(Math.random() * names.length)];
     setParticipants(prev => [...prev, {
         id, name, role: 'Simulation', isHost: false, isLocal: false, hasVideo: true, hasAudio: true, status: 'active',
         metrics: { attention: 60, stress: 20, curiosity: 80, postureScore: 0 }
     }]);
     addEvent('join', `${name} (Bot) added for demo.`, name);
  };


  // AI Simulation Loop for Remote Users using CognitiveModel
  useEffect(() => {
    if (view !== 'room') return;

    const interval = setInterval(() => {
      setParticipants(prevParticipants => {
        return prevParticipants.map(p => {
            // Skip local user or already kicked users
            if (p.isLocal || p.status === 'kicked') return p;

            // Get or create model for this remote participant
            let model = remoteModelsRef.current[p.id];
            if (!model) {
                model = new CognitiveModel();
                remoteModelsRef.current[p.id] = model;
            }

            // Init tracking state if missing
            if (!participantTrackingRef.current[p.id]) {
                participantTrackingRef.current[p.id] = { 
                    badPostureSeconds: 0, 
                    toxicCount: 0,
                    highStressSeconds: 0,
                    lowAttentionSeconds: 0,
                    inappropriateFlag: false
                };
            }
            const tracking = participantTrackingRef.current[p.id];

            // Generate simulated inputs
            const interactionLevel = Math.random() > 0.8 ? Math.random() : 0; // Occasional activity
            const simulatedGazeFocus = 0.4 + (Math.random() * 0.6); // Generally looking at screen (0.4-1.0)
            const visualScanning = Math.random() * 0.3; // Some eye movement
            
            let simulatedValence: 'positive' | 'negative' | 'neutral' = 'neutral';
            const valenceRoll = Math.random();
            if (valenceRoll > 0.98) simulatedValence = 'negative'; // Rare negative spikes
            else if (valenceRoll > 0.95) simulatedValence = 'positive'; // Rare positive spikes

            // Update model
            const newMetrics = model.update({
                interactionLevel,
                simulatedGazeFocus,
                simulatedValence,
                visualScanning
            });

            // --- 1. Posture & Inappropriate Behavior Simulation ---
            let postureScore = p.metrics.postureScore;
            // 1% chance to detect bad posture event
            if (Math.random() < 0.01 && postureScore < 50) {
                 postureScore = 100; // Trigger violation
                 // Determine type: 80% slouching, 20% inappropriate/safety
                 tracking.inappropriateFlag = Math.random() < 0.2;
                 
                 const msg = tracking.inappropriateFlag 
                    ? `AI WARNING: Inappropriate body language/appearance detected for ${p.name}.`
                    : `Bad posture detected for ${p.name} (Slouching/Disengaged).`;
                    
                 eventsQueue.current.push({
                     id: Date.now() + Math.random(),
                     timestamp: Date.now(),
                     type: 'warning',
                     message: msg,
                     targetUser: p.name
                 });
            } else {
                postureScore = Math.max(0, postureScore - 3); // Slower recovery to ensure sustained detection
            }

            // Update posture duration tracking
            if (postureScore > 50) {
                tracking.badPostureSeconds += 1;
            } else {
                tracking.badPostureSeconds = 0;
            }

            // Check KICK condition for Posture/Inappropriate
            if (tracking.badPostureSeconds >= 10) {
                 const reason = tracking.inappropriateFlag ? 'inappropriate body language' : 'sustained bad body language';
                 eventsQueue.current.push({
                     id: Date.now() + Math.random(),
                     timestamp: Date.now(),
                     type: 'kick',
                     message: `AI ACTION: Removed ${p.name} for ${reason} (>10s).`,
                     targetUser: p.name
                 });
                 if (peersRef.current[p.id]) peersRef.current[p.id].close();
                 return { 
                     ...p, 
                     status: 'kicked' as const, 
                     stream: undefined, 
                     hasVideo: false, 
                     hasAudio: false,
                     metrics: { ...newMetrics, postureScore } 
                 };
            }

            // --- 2. Toxic Language Simulation ---
            // 0.5% chance per second to utter toxic word
            if (Math.random() < 0.005) {
                 tracking.toxicCount += 1;
                 const toxicWords = ["stupid", "idiot", "hate", "trash", "damn"];
                 const word = toxicWords[Math.floor(Math.random() * toxicWords.length)];
                 
                 // Check KICK condition for Toxicity (3 Strikes)
                 if (tracking.toxicCount >= 3) {
                     eventsQueue.current.push({
                         id: Date.now() + Math.random(),
                         timestamp: Date.now(),
                         type: 'kick',
                         message: `AI ACTION: Removed ${p.name} for repeated abusive language (3rd Strike).`,
                         targetUser: p.name
                     });
                     if (peersRef.current[p.id]) peersRef.current[p.id].close();
                     return { 
                         ...p, 
                         status: 'kicked' as const, 
                         stream: undefined, 
                         hasVideo: false, 
                         hasAudio: false,
                         metrics: { ...newMetrics, postureScore } 
                     };
                 } else {
                     eventsQueue.current.push({
                         id: Date.now() + Math.random(),
                         timestamp: Date.now(),
                         type: 'warning',
                         message: `${p.name} used bad word '${word}' (Strike ${tracking.toxicCount}/3)`,
                         targetUser: p.name
                     });
                 }
            }

            // --- 3. Stress Coaching Logic ---
            if (newMetrics.stress > 70) {
                tracking.highStressSeconds += 1;
            } else {
                tracking.highStressSeconds = 0;
            }

            if (tracking.highStressSeconds === 15) { // Trigger exactly at 15s mark
                 eventsQueue.current.push({
                     id: Date.now() + Math.random(),
                     timestamp: Date.now(),
                     type: 'intervention',
                     message: `${p.name} stress is high. Suggest: crack a light joke, let them stretch, or give a short break.`,
                     targetUser: p.name
                 });
            }

            // --- 4. Attention/Curiosity Coaching Logic ---
            if (newMetrics.attention < 40 || newMetrics.curiosity < 40) {
                tracking.lowAttentionSeconds += 1;
            } else {
                tracking.lowAttentionSeconds = 0;
            }

            if (tracking.lowAttentionSeconds === 20) { // Trigger exactly at 20s mark
                 eventsQueue.current.push({
                     id: Date.now() + Math.random(),
                     timestamp: Date.now(),
                     type: 'intervention',
                     message: `${p.name} seems to be losing attention/curiosity. Suggest: share a new example, ask a question, or give a quick brainstorming activity.`,
                     targetUser: p.name
                 });
            }


            return {
                ...p,
                metrics: {
                    attention: newMetrics.attention,
                    stress: newMetrics.stress,
                    curiosity: newMetrics.curiosity,
                    postureScore
                }
            };
        });
      });
    }, 1000); // 1Hz update for remote users

    return () => clearInterval(interval);
  }, [view]);


  const downloadCSV = () => {
      const headers = ["Timestamp", "Event Type", "Message", "Target User"];
      // Sort chronologically for export
      const chronologicalEvents = [...events].reverse();
      
      const rows = chronologicalEvents.map(e => {
          const time = new Date(e.timestamp).toLocaleString();
          return [
              escapeCSV(time),
              escapeCSV(e.type),
              escapeCSV(e.message),
              escapeCSV(e.targetUser || "-")
          ].join(",");
      });
      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `neuro_meet_log_${meetingCode || 'session'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };
  
  // Calculate dynamic grid classes for optimal video tile layout
  const getGridClass = (count: number) => {
    // We use a combination of grid-cols and auto-rows-minmax to ensure tiles are large and visible
    // Mobile first (stacked), then tablet/desktop (grid)
    if (count <= 1) return 'grid-cols-1 auto-rows-[minmax(0,1fr)]';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 auto-rows-[minmax(0,1fr)]';
    if (count <= 4) return 'grid-cols-2 auto-rows-[minmax(0,1fr)]'; // 2x2
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3 auto-rows-[minmax(0,1fr)]'; // 2x3 or 3x2
    if (count <= 9) return 'grid-cols-3 auto-rows-[minmax(0,1fr)]'; // 3x3
    return 'grid-cols-3 md:grid-cols-4 auto-rows-[minmax(0,1fr)]'; // 3x4 or 4x3 (Up to 12)
  };


  // --- VIEWS ---

  if (view === 'landing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-8">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2">
            &larr; Back to Home
        </button>
        <h2 className="text-4xl font-bold text-white mb-8">NeuroLens Meeting Guardian</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
            <button 
                onClick={handleHostStart}
                className="group relative flex flex-col items-center p-8 bg-gray-900 border border-gray-700 hover:border-cyan-500 rounded-2xl transition-all hover:bg-gray-800"
            >
                <div className="p-4 bg-cyan-900/30 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <CameraIcon />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Host a Meeting</h3>
                <p className="text-gray-400 text-center">Create a room, set rules, and monitor AI analytics for all participants.</p>
            </button>

            <button 
                onClick={handleJoinStart}
                className="group relative flex flex-col items-center p-8 bg-gray-900 border border-gray-700 hover:border-violet-500 rounded-2xl transition-all hover:bg-gray-800"
            >
                 <div className="p-4 bg-violet-900/30 rounded-full mb-4 group-hover:scale-110 transition-transform">
                    <BrainIcon />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Join a Meeting</h3>
                <p className="text-gray-400 text-center">Enter with a code. Your cognitive state will be analyzed in real-time.</p>
            </button>
        </div>
        <div className="mt-8 text-center text-gray-500 text-sm max-w-md">
            <p>&copy; 2025 NeuroLens Meeting Guardian. Created by Thejas Sreenivasu.</p>
        </div>
      </div>
    );
  }

  if (view === 'host-setup') {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-md mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800">
             <h2 className="text-2xl font-bold text-white mb-6">Setup Meeting</h2>
             
             <div className="w-full mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">Max Participants (2-10)</label>
                <select 
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                    {[2,3,4,5,6,7,8,9,10].map(num => (
                        <option key={num} value={num}>{num} Participants</option>
                    ))}
                </select>
             </div>

             <div className="w-full mb-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                    <BrainIcon /> AI Guardian Consent
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                    By starting this meeting, you agree to real-time AI analysis of:
                </p>
                <ul className="text-xs text-gray-500 list-disc pl-4 mb-3 space-y-1">
                    <li>Facial Micro-expressions (Stress/Attention)</li>
                    <li>Body Posture & Language detection</li>
                    <li>Voice Toxicity monitoring</li>
                </ul>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={hasConsented}
                        onChange={(e) => setHasConsented(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500/50" 
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">I understand and agree.</span>
                </label>
            </div>

             <div className="w-full mb-8 text-center bg-black/30 p-4 rounded-lg border border-dashed border-gray-600">
                <p className="text-sm text-gray-500 mb-2">Share this Code</p>
                <p className="text-4xl font-mono font-bold text-cyan-400 tracking-wider">{meetingCode}</p>
             </div>

             <div className="flex gap-4 w-full">
                <button onClick={() => setView('landing')} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Cancel</button>
                <button 
                    onClick={confirmHostMeeting} 
                    disabled={!hasConsented}
                    className="flex-1 py-3 bg-cyan-600 text-white font-bold rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Start Meeting
                </button>
             </div>
        </div>
    );
  }

  if (view === 'join-login') {
    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-md mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800">
             <h2 className="text-2xl font-bold text-white mb-6">Join Meeting</h2>
             
             <div className="w-full space-y-4 mb-6">
                {joinError && (
                    <div className="p-3 bg-red-900/40 border border-red-500/40 rounded text-red-200 text-sm flex items-center gap-2">
                        <ExclamationIcon />
                        {joinError}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Meeting Code</label>
                    <input 
                        type="text" 
                        maxLength={5}
                        placeholder="A9K3Z"
                        value={joinCode}
                        onChange={(e) => {
                            setJoinCode(e.target.value.toUpperCase());
                            setJoinError(null);
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white font-mono uppercase focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Your Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. John Doe"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Developer"
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                </div>
             </div>

             <div className="w-full mb-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <h3 className="text-sm font-bold text-violet-400 mb-2 flex items-center gap-2">
                    <BrainIcon /> AI Guardian Consent
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                    By joining this meeting, you agree to real-time AI analysis of:
                </p>
                <ul className="text-xs text-gray-500 list-disc pl-4 mb-3 space-y-1">
                    <li>Facial Micro-expressions (Stress/Attention)</li>
                    <li>Body Posture & Language detection</li>
                    <li>Voice Toxicity monitoring</li>
                </ul>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                        type="checkbox" 
                        checked={hasConsented}
                        onChange={(e) => setHasConsented(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-violet-500 focus:ring-violet-500/50" 
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">I understand and agree.</span>
                </label>
            </div>

             <div className="flex gap-4 w-full">
                <button onClick={() => setView('landing')} className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">Cancel</button>
                <button 
                    onClick={confirmJoinMeeting} 
                    disabled={isValidating || !hasConsented}
                    className="flex-1 py-3 bg-violet-600 text-white font-bold rounded-lg hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isValidating ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Checking...
                        </>
                    ) : 'Join Now'}
                </button>
             </div>
        </div>
    );
  }

  // ROOM VIEW
  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* LEFT/MAIN: Video Grid */}
        <div className="flex-1 flex flex-col h-full relative p-4 overflow-hidden">
            <header className="flex justify-between items-center mb-4 bg-gray-900/80 p-3 rounded-lg backdrop-blur shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white">NeuroLens Room <span className="text-cyan-400 font-mono text-base ml-2">#{meetingCode || joinCode}</span></h1>
                    <div className="bg-gray-800 px-3 py-1 rounded text-cyan-400 font-mono font-bold border border-gray-700">
                        {elapsedTime}
                    </div>
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded animate-pulse">● REC & Analyzing</span>
                </div>
                <div className="flex gap-2">
                    {/* Dev Tool: Add simulated bot */}
                    <button onClick={addSimulatedBot} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded border border-gray-600">
                        + Sim Bot
                    </button>
                    {/* Added button */}
                    <button onClick={downloadCSV} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-cyan-400 text-xs rounded border border-gray-600 flex items-center gap-1" title="Download Session Report">
                        <DownloadIcon /> <span className="hidden sm:inline">Report</span>
                    </button>
                    <button onClick={() => {
                        if (window.confirm("End meeting and generate report?")) {
                            downloadCSV();
                            onBack();
                        }
                    }} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded">End Meeting</button>
                </div>
            </header>

            {/* Error Banner */}
            {cameraError && (
                 <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 text-red-200 rounded flex items-center gap-2 shrink-0">
                    <ExclamationIcon />
                    {cameraError}
                 </div>
            )}
            
            {participants.length === 1 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-50 z-0">
                    <p className="text-gray-400 text-lg mb-2">Waiting for others to join...</p>
                    <p className="text-gray-600 text-sm">Open this page in a new tab and join with code: {meetingCode}</p>
                </div>
            )}

            <div className={`grid gap-4 w-full h-full content-center z-10 ${getGridClass(participants.length)}`}>
                {participants.map((p) => (
                    <VideoTile 
                        key={p.id} 
                        participant={p} 
                        amIHost={amIHost} 
                        onAdminAction={handleAdminAction} 
                    />
                ))}
            </div>
        </div>

        {/* RIGHT: Sidebar (Participants + Guardian + Log) */}
        <div className="w-full md:w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-[50vh] md:h-full shrink-0 z-30">
            
            {/* 1. Participant List */}
            <div className="p-4 border-b border-gray-800">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Participants ({participants.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {participants.map(p => (
                        <div key={p.id} className={`flex items-center justify-between p-2 rounded border ${p.status === 'kicked' ? 'bg-red-900/10 border-red-900' : 'bg-gray-800/50 border-gray-700/50'}`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-green-500' : p.status === 'kicked' ? 'bg-gray-500' : 'bg-red-500'}`}></div>
                                <div>
                                    <p className={`text-sm font-medium leading-none ${p.status === 'kicked' ? 'text-gray-500 line-through' : 'text-white'}`}>{p.name}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{p.status === 'kicked' ? 'REMOVED' : p.role}</p>
                                </div>
                            </div>
                            <div className="flex gap-1.5 items-center">
                                {!p.hasVideo && p.status !== 'kicked' && (
                                    <span title="Camera Off" className="text-gray-500">
                                        <VideoOffIcon />
                                    </span>
                                )}
                                {!p.hasAudio && p.status !== 'kicked' && (
                                    <span title="Microphone Muted" className="text-red-500">
                                        <MicOffIcon />
                                    </span>
                                )}
                                {p.metrics.stress > 80 && p.status !== 'kicked' && <span title="High Stress" className="text-red-400 text-xs font-bold">⚠</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Guardian Insights */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex-1 overflow-y-auto">
                 <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BrainIcon /> AI Guardian Insights
                 </h3>
                 <div className="space-y-3">
                    {participants.map(p => {
                        if (p.status === 'kicked') return null;

                        let statusMsg = "Stable state.";
                        let color = "text-gray-500";
                        
                        // Precise messages as requested
                        if (p.metrics.stress > 70) { 
                            statusMsg = "Stress is high. Suggest: crack a light joke, let them stretch, or give a short break."; 
                            color = "text-red-400"; 
                        }
                        else if (p.metrics.attention < 40 || p.metrics.curiosity < 40) { 
                            statusMsg = "Seems to be losing attention/curiosity. Suggest: share a new example, ask a question, or give a quick brainstorming activity."; 
                            color = "text-yellow-400"; 
                        }
                        else if (p.metrics.curiosity > 70) { 
                            statusMsg = "Highly engaged and curious."; 
                            color = "text-green-400"; 
                        }

                        return (
                            <div key={p.id} className="text-xs border-b border-gray-800/50 pb-2 last:border-0">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-gray-300">{p.name}</span>
                                    {/* Optional: Add icons or small stats here */}
                                </div>
                                <p className={`${color} leading-relaxed`}>{statusMsg}</p>
                            </div>
                        );
                    })}
                 </div>
            </div>

            {/* 3. Event Log */}
            <div className="p-4 bg-black/20 h-1/3 flex flex-col min-h-[200px]">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex justify-between items-center sticky top-0 bg-transparent z-10">
                    Session Log
                    <button onClick={downloadCSV} className="flex items-center gap-1 text-cyan-500 hover:text-cyan-400 text-[10px] uppercase tracking-widest border border-cyan-500/30 px-2 py-1 rounded transition-colors" title="Export CSV">
                        <DownloadIcon /> Export
                    </button>
                </h3>
                <div ref={eventLogRef} className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-1.5">
                    {events.map(e => {
                        let styles = 'border-gray-700 bg-gray-800/30 text-gray-400';
                        let icon = <span className="text-gray-500">•</span>;

                        if (e.type === 'join') {
                            styles = 'border-green-500/50 bg-green-500/10 text-green-300';
                            icon = (
                                <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            );
                        } else if (e.type === 'leave') {
                            styles = 'border-gray-500/50 bg-gray-700/20 text-gray-400';
                            icon = (
                                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                </svg>
                            );
                        } else if (e.type === 'warning') {
                            styles = 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200';
                            icon = (
                                <svg className="w-3 h-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            );
                        } else if (e.type === 'kick') {
                            styles = 'border-red-500/50 bg-red-900/20 text-red-300';
                             icon = (
                                <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            );
                        } else if (e.type === 'intervention') {
                            styles = 'border-cyan-500/50 bg-cyan-900/20 text-cyan-300';
                            icon = (
                                <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            );
                        }

                        return (
                            <div key={e.id} className={`flex gap-2 p-2.5 rounded-md border-l-[3px] shadow-sm ${styles}`}>
                                <div className="text-[10px] opacity-60 font-mono min-w-[50px] pt-0.5">
                                    {new Date(e.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                                </div>
                                <div className="flex-1 text-xs font-medium break-words leading-relaxed">
                                    <div className="flex items-center gap-1.5 mb-0.5 opacity-80 uppercase text-[9px] tracking-wider font-bold">
                                        {icon}
                                        {e.type}
                                    </div>
                                    {e.message}
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && <p className="text-gray-600 italic text-xs text-center mt-4">Waiting for events...</p>}
                </div>
            </div>
            
            {/* Control Bar */}
            <div className="p-3 border-t border-gray-800 flex justify-around items-center bg-gray-900/80 backdrop-blur z-20">
                <button 
                    onClick={toggleLocalAudio}
                    className={`p-3 rounded-full transition-all ${localParticipant?.hasAudio ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                    title={localParticipant?.hasAudio ? "Mute Microphone" : "Unmute Microphone"}
                >
                    {localParticipant?.hasAudio ? <MicIcon /> : <MicOffIcon />}
                </button>
                
                <button 
                    onClick={toggleLocalVideo}
                    className={`p-3 rounded-full transition-all ${localParticipant?.hasVideo ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                    title={localParticipant?.hasVideo ? "Turn Camera Off" : "Turn Camera On"}
                >
                    {localParticipant?.hasVideo ? <VideoIcon /> : <VideoOffIcon />}
                </button>
                
                <button className="p-3 rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors" title="Chat (Coming Soon)">
                    <span className="text-xl leading-none">💬</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default MeetingPlatform;
