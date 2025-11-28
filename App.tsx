
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import FeatureCard from './components/FeatureCard';
import MeetingPlatform from './components/MeetingPlatform';
import { CameraIcon } from './components/icons/CameraIcon';
import { EyeIcon } from './components/icons/EyeIcon';
import { CursorClickIcon } from './components/icons/CursorClickIcon';
import { BrainIcon } from './components/icons/BrainIcon';
import { ChipIcon } from './components/icons/ChipIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';

type ViewState = 'landing' | 'meeting';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');

  if (currentView === 'meeting') {
    return <MeetingPlatform onBack={() => setCurrentView('landing')} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans">
      <div className="absolute inset-0 -z-10 h-full w-full bg-gray-950 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      
      <main className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero Section */}
        <section className="text-center mb-20 md:mb-32">
          <div className="inline-block bg-cyan-500/10 text-cyan-400 text-sm font-medium px-4 py-1 rounded-full mb-4">
            Human–AI Co-Learning System
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            NeuroLens AI
          </h1>
          <p className="mt-6 text-lg md:text-xl max-w-3xl mx-auto text-gray-400 mb-8">
            Real-time Cognitive State Analytics. We decode human intent by reading facial micro-expressions, eye tracking patterns, and interaction logs.
          </p>
          
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <button 
              onClick={() => setCurrentView('meeting')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold text-lg shadow-lg shadow-cyan-500/20 transition-all transform hover:scale-105"
            >
              Launch Meeting Guardian
            </button>
            <a href="#dashboard" className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold text-lg border border-gray-700 transition-all">
              View Analytics Demo
            </a>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mb-20 md:mb-32">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CameraIcon />}
              title="Facial Micro-Expressions"
              description="Our AI analyzes subtle, involuntary facial movements to accurately gauge emotional and cognitive states."
            />
            <FeatureCard
              icon={<EyeIcon />}
              title="Eye Tracking & Gaze"
              description="We monitor pupil dilation and gaze patterns to measure focus, cognitive load, and areas of interest."
            />
            <FeatureCard
              icon={<CursorClickIcon />}
              title="Interaction Logs"
              description="By analyzing clicks, hovers, and typing patterns, we understand user engagement and hesitation."
            />
          </div>
        </section>

        {/* Dashboard Section */}
        <section id="dashboard" className="mb-20 md:mb-32">
           <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">Live Analytics Dashboard</h2>
           <Dashboard />
        </section>

        {/* Use Cases Section */}
        <section className="mb-16 md:mb-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-gray-900 rounded-lg border border-gray-800 transition-all hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10">
              <h3 className="text-2xl font-bold mb-3 text-cyan-400">Adaptive E-Learning</h3>
              <p className="text-gray-400">
                Dynamically adjusts course difficulty and content based on a student's attention and stress levels.
              </p>
            </div>
            <div className="p-8 bg-gray-900 rounded-lg border border-gray-800 transition-all hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-500/10">
              <h3 className="text-2xl font-bold mb-3 text-violet-400">Workplace Wellness</h3>
              <p className="text-gray-400">
                Monitors employee cognitive load and stress to suggest timely breaks and prevent burnout.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-gray-800">
        <p className="text-gray-500">Created by Thejas Sreenivasu | &copy; {new Date().getFullYear()} NeuroLens AI.</p>
      </footer>
    </div>
  );
};

export default App;
