
import React, { useState, useEffect, useRef } from 'react';
import { DownloadIcon } from './icons/DownloadIcon';
import { BrainIcon } from './icons/BrainIcon';
import { BellIcon } from './icons/BellIcon';
import { ExclamationIcon } from './icons/ExclamationIcon';
import type { Participant } from '../types';

interface MeetingPlatformProps {
  onBack: () => void;
}

const MeetingPlatform: React.FC<MeetingPlatformProps> = ({ onBack }) => {
    const [participants, setParticipants] = useState<Participant[]>([
        {
            id: '1',
            name: 'You',
            role: 'Host',
            isHost: true,
            isLocal: true,
            hasVideo: true,
            hasAudio: true,
            status: 'active',
            metrics: { attention: 85, stress: 20, curiosity: 70, postureScore: 10 }
        },
        {
            id: '2',
            name: 'Alice Johnson',
            role: 'Participant',
            isHost: false,
            isLocal: false,
            hasVideo: true,
            hasAudio: true,
            status: 'active',
            metrics: { attention: 60, stress: 45, curiosity: 50, postureScore: 30 }
        },
        {
            id: '3',
            name: 'Bob Smith',
            role: 'Participant',
            isHost: false,
            isLocal: false,
            hasVideo: false,
            hasAudio: true,
            status: 'warning',
            metrics: { attention: 30, stress: 15, curiosity: 20, postureScore: 80 }
        }
    ]);
    
    const [currentTime, setCurrentTime] = useState(new Date());
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Mock accessing camera for local user
    useEffect(() => {
        const startCamera = async () => {
             try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
             } catch (err) {
                 console.error("Camera access denied or not available", err);
             }
        };
        startCamera();
        
        return () => {
             if (videoRef.current && videoRef.current.srcObject) {
                 const stream = videoRef.current.srcObject as MediaStream;
                 stream.getTracks().forEach(track => track.stop());
             }
        };
    }, []);

    // Mock updating metrics
    useEffect(() => {
        const interval = setInterval(() => {
            setParticipants(prev => prev.map(p => ({
                ...p,
                metrics: {
                    attention: Math.max(0, Math.min(100, p.metrics.attention + (Math.random() - 0.5) * 10)),
                    stress: Math.max(0, Math.min(100, p.metrics.stress + (Math.random() - 0.5) * 10)),
                    curiosity: Math.max(0, Math.min(100, p.metrics.curiosity + (Math.random() - 0.5) * 10)),
                    postureScore: Math.max(0, Math.min(100, p.metrics.postureScore + (Math.random() - 0.5) * 5)),
                }
            })));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const amIHost = participants.find(p => p.isLocal)?.isHost ?? false;

    const downloadCSV = () => {
        const headers = ["Participant", "Role", "Attention", "Stress", "Curiosity"];
        const rows = participants.map(p => 
            [p.name, p.role, p.metrics.attention.toFixed(1), p.metrics.stress.toFixed(1), p.metrics.curiosity.toFixed(1)].join(',')
        );
        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "meeting_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-sans">
             {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <BrainIcon />
                         </div>
                         <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Meeting Guardian</h1>
                    </div>
                    <div className="h-6 w-px bg-gray-700 mx-2"></div>
                    <span className="text-gray-400 font-mono text-sm">{currentTime.toLocaleTimeString()}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={downloadCSV} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 text-sm font-medium rounded-md border border-gray-700 transition-colors flex items-center gap-2" title="Download Session Report">
                        <DownloadIcon /> <span className="hidden sm:inline">Report</span>
                    </button>
                    {amIHost ? (
                        <button 
                            onClick={() => {
                                if (window.confirm("End the meeting? This will generate the session report and close the room.")) {
                                    downloadCSV();
                                    onBack();
                                }
                            }} 
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-md shadow-lg shadow-red-900/20 hover:shadow-red-900/50 transition-all"
                        >
                            End Meeting
                        </button>
                    ) : (
                        <button 
                            onClick={() => {
                                if (window.confirm("Are you sure you want to leave the meeting?")) {
                                    onBack();
                                }
                            }} 
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-md border border-gray-700 transition-colors"
                        >
                            Leave
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col md:flex-row gap-4">
                {/* Video Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr overflow-y-auto">
                    {participants.map(participant => (
                        <div key={participant.id} className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl group">
                            {participant.isLocal ? (
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-500">
                                        {participant.name.charAt(0)}
                                    </div>
                                </div>
                            )}
                            
                            {/* Overlay Info */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-white shadow-black drop-shadow-md">{participant.name} {participant.isLocal && '(You)'}</span>
                                    {participant.metrics.attention < 40 && (
                                        <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded text-xs border border-yellow-400/20 backdrop-blur-sm">
                                            <ExclamationIcon /> Low Attention
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Cognitive Metrics Overlay (Visible on Hover/Always for Host) */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-950/80 backdrop-blur-md p-3 rounded-lg border border-gray-800 text-xs w-36 shadow-lg pointer-events-none">
                                <div>
                                    <div className="flex justify-between mb-1 text-gray-400 font-semibold">Attention</div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${participant.metrics.attention > 70 ? 'bg-cyan-400' : participant.metrics.attention > 40 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{width: `${participant.metrics.attention}%`}}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1 text-gray-400 font-semibold">Stress</div>
                                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${participant.metrics.stress < 40 ? 'bg-green-400' : participant.metrics.stress < 70 ? 'bg-orange-400' : 'bg-red-500'}`} style={{width: `${participant.metrics.stress}%`}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sidebar Metrics */}
                <div className="w-full md:w-80 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-6 overflow-y-auto shadow-2xl">
                    <div>
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <BellIcon />
                            Live Insights
                        </h2>
                        <div className="space-y-3">
                            {/* Mock Notifications */}
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <h3 className="text-red-400 font-bold text-sm mb-1">High Stress Detected</h3>
                                <p className="text-xs text-gray-400">Multiple participants showing elevated stress markers.</p>
                            </div>
                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                <h3 className="text-cyan-400 font-bold text-sm mb-1">Engagement Optimal</h3>
                                <p className="text-xs text-gray-400">Group attention levels are currently high.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Participant Status</h2>
                        <div className="space-y-2">
                            {participants.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${p.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`}></div>
                                        <span className="text-sm text-gray-300 font-medium">{p.name}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.metrics.attention > 50 ? 'bg-gray-700 text-cyan-300' : 'bg-red-900/30 text-red-400 border border-red-900/50'}`}>
                                        {Math.round(p.metrics.attention)}% Attn
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MeetingPlatform;
