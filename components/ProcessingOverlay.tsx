import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingOverlayProps {
  progress: number; // 0 to 100
  fps: number;
  currentFrame: number;
  totalFrames: number;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ 
  progress, 
  fps, 
  currentFrame, 
  totalFrames 
}) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center fade-in duration-200">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-6">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-blue-50 p-4 rounded-full">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Scanning Footage</h3>
          <p className="text-slate-500">Detecting menu patterns...</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-700">{fps}</div>
            <div className="text-xs text-slate-400 font-medium uppercase">FPS</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-700">
              {currentFrame}<span className="text-slate-400 text-lg font-normal">/{totalFrames}</span>
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase">Frames</div>
          </div>
        </div>
      </div>
    </div>
  );
};