import React from 'react';
import { AlertTriangle, CheckCircle, Scissors } from 'lucide-react';
import { Button } from './Button';
import { TimeRange } from '../services/TimelineManager';

interface AnalysisDashboardProps {
  badSegments: TimeRange[];
  keepSegments: TimeRange[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  badSegments,
  keepSegments,
  onConfirm,
  onCancel
}) => {
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const totalRemoved = badSegments.reduce((acc, seg) => acc + (seg.end - seg.start), 0);

  return (
    <div className="w-full max-w-4xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
      
      {/* Summary Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analysis Complete</h2>
            <p className="text-slate-500">
              Found <span className="font-bold text-red-600">{badSegments.length} interruptions</span> matching the menu fingerprint.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">{formatTime(totalRemoved)}</div>
            <div className="text-sm text-slate-400 uppercase tracking-wide font-medium">Total Footage Removed</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Bad Segments List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-red-50/50 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h3 className="font-semibold text-slate-900">Detected Interruptions (To Cut)</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {badSegments.map((seg, idx) => (
              <div key={seg.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-400">#{idx + 1}</span>
                <div className="font-mono text-sm text-slate-700">
                  {formatTime(seg.start)} <span className="text-slate-300 mx-2">→</span> {formatTime(seg.end)}
                </div>
              </div>
            ))}
            {badSegments.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No menus detected.</div>
            )}
          </div>
        </div>

        {/* Keep Segments List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-green-50/50 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <h3 className="font-semibold text-slate-900">Clean Gameplay (To Keep)</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {keepSegments.map((seg, idx) => (
              <div key={seg.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-400">Part {idx + 1}</span>
                <div className="font-mono text-sm text-slate-700">
                  {formatTime(seg.start)} <span className="text-slate-300 mx-2">→</span> {formatTime(seg.end)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-4">
        <Button variant="ghost" onClick={onCancel}>Discard Results</Button>
        <Button onClick={onConfirm} className="pl-3 pr-5">
          <Scissors size={18} className="mr-2" />
          Export Clean Video
        </Button>
      </div>
    </div>
  );
};