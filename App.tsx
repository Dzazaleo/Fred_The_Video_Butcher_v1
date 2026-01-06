import React, { useState, useEffect, useCallback } from 'react';
import { VideoDropZone } from './components/VideoDropZone';
import { VideoPreview } from './components/VideoPreview';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { Button } from './components/Button'; // Ensure this export exists
import { VideoAsset } from './types';
import { Clapperboard } from 'lucide-react';

// Services
import { VisionProcessor, ProcessingProgress } from './services/VisionProcessor';
import { TimelineManager, TimelineState } from './services/TimelineManager';

type AppState = 'IDLE' | 'PREVIEW' | 'PROCESSING' | 'REVIEW';

const App: React.FC = () => {
  const [activeAsset, setActiveAsset] = useState<VideoAsset | null>(null);
  const [appState, setAppState] = useState<AppState>('IDLE');
  
  // Processing State
  const [progress, setProgress] = useState<ProcessingProgress>({
    processedFrames: 0, 
    totalFrames: 0, 
    fps: 0, 
    currentTimestamp: 0
  });
  
  // Results State
  const [timelineData, setTimelineData] = useState<TimelineState | null>(null);

  // Memory Management
  useEffect(() => {
    return () => {
      if (activeAsset?.previewUrl) {
        URL.revokeObjectURL(activeAsset.previewUrl);
        console.log(`[Memory] Revoked URL: ${activeAsset.previewUrl}`);
      }
    };
  }, [activeAsset]);

  const handleFileSelected = useCallback((file: File, url: string) => {
    if (activeAsset) URL.revokeObjectURL(activeAsset.previewUrl);
    setActiveAsset({ file, previewUrl: url });
    setAppState('PREVIEW');
  }, [activeAsset]);

  const handleRemoveVideo = useCallback(() => {
    setActiveAsset(null);
    setAppState('IDLE');
    setTimelineData(null);
  }, []);

  const handleStartProcessing = async () => {
    if (!activeAsset) return;
    
    setAppState('PROCESSING');
    
    try {
      const vision = VisionProcessor.getInstance();
      
      // 1. Run Vision Analysis
      const rawDetections = await vision.analyzeVideo(activeAsset, (p) => {
        setProgress(p);
      });

      // 2. Run Timeline Logic
      // Note: We need the video duration. The VisionProcessor knows it, 
      // but simpler to grab it from the progress or video element. 
      // For this implementation, we use the progress total duration approx.
      const estimatedDuration = progress.totalFrames > 0 
        ? (progress.totalFrames / 30) // Fallback if needed, but analyzeVideo loop handles time accurately
        : rawDetections[rawDetections.length - 1]?.timestamp || 0; 
        
      // Better approach: Retrieve duration from the video element used in preview 
      // (Simplified for this snippet, assumes TimelineManager can handle the math)
       const videoElement = document.createElement('video');
       videoElement.src = activeAsset.previewUrl;
       await new Promise<void>(r => { videoElement.onloadedmetadata = () => r(); });
      
      const results = TimelineManager.processDetections(rawDetections, videoElement.duration);
      
      setTimelineData(results);
      setAppState('REVIEW');
      
    } catch (error) {
      console.error("Processing failed:", error);
      alert("Error processing video. Check console.");
      setAppState('PREVIEW');
    }
  };

  const handleExport = () => {
    alert("FFmpeg Export Module not yet connected.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Clapperboard size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Fred<span className="text-blue-600">Butcher</span></h1>
          </div>
          <div className="text-sm text-slate-500">v1.0.0</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* State: Processing Overlay */}
        {appState === 'PROCESSING' && (
          <ProcessingOverlay 
            progress={(progress.processedFrames / progress.totalFrames) * 100}
            fps={progress.fps}
            currentFrame={progress.processedFrames}
            totalFrames={progress.totalFrames}
          />
        )}

        <div className="max-w-4xl mx-auto">
          {/* Header Text */}
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">
              {appState === 'REVIEW' ? 'Review Edits' : 
               appState === 'PREVIEW' ? 'Review Source' : 'Import Footage'}
            </h2>
            <p className="text-slate-500 text-lg">
              {appState === 'REVIEW' ? 'Confirm the detected interruptions below.' :
               appState === 'PREVIEW' ? 'Ready to analyze for debug menus.' :
               'Upload raw gameplay to begin automated cleanup.'}
            </p>
          </div>

          {/* Conditional Views */}
          <div className="transition-all duration-300">
            
            {appState === 'IDLE' && (
              <VideoDropZone onFileSelected={handleFileSelected} />
            )}

            {appState === 'PREVIEW' && activeAsset && (
              <div className="space-y-6">
                <VideoPreview asset={activeAsset} onRemove={handleRemoveVideo} />
                <div className="flex justify-center">
                   <Button onClick={handleStartProcessing} className="w-full max-w-xs shadow-lg shadow-blue-600/20 py-3 text-lg">
                     Process Footage
                   </Button>
                </div>
              </div>
            )}

            {appState === 'REVIEW' && timelineData && (
              <AnalysisDashboard 
                badSegments={timelineData.badSegments}
                keepSegments={timelineData.keepSegments}
                onConfirm={handleExport}
                onCancel={() => setAppState('PREVIEW')}
              />
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;