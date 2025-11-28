
export interface CognitiveDataPoint {
  time: number;
  attention: number;
  stress: number;
  curiosity: number;
}

export interface Notification {
  id: number;
  type: 'stress' | 'attention-drop' | 'low-attention' | 'low-curiosity' | 'toxicity' | 'posture';
  title: string;
  message: string;
  intensity: number; // Value from 0 to 1
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  isHost: boolean;
  isLocal: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  status: 'active' | 'warning' | 'kicked';
  stream?: MediaStream; // WebRTC Stream
  metrics: {
    attention: number;
    stress: number;
    curiosity: number;
    postureScore: number; // 0-100 (100 is bad)
  };
}

export interface MeetingEvent {
  id: number;
  timestamp: number;
  type: 'join' | 'leave' | 'warning' | 'kick' | 'intervention';
  message: string;
  targetUser?: string;
}
