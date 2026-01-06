import React, { useState, useEffect, useCallback } from 'react';
import { VideoDropZone } from './components/VideoDropZone';
import { VideoPreview } from './components/VideoPreview';
import { ReferenceUploader } from './components/ReferenceUploader';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { Button } from './components/Button';
import { VideoAsset } from './types';
import { Clapperboard, AlertCircle } from 'lucide-react';

import { VisionProcessor, ProcessingProgress } from './services/VisionProcessor';
import { TimelineManager, TimelineState } from './services/TimelineManager';

type AppState = 'IDLE' | 'PREVIEW' | 'PROCESSING' | 'REVIEW';

const App: React.FC = () => {
  const [activeAsset, setActiveAsset] = useState<VideoAsset | null>(null);
  const [referenceImg, setReferenceImg] = useState<{file: File, url: string} | null>(null);
  const [appState, setAppState] = useState<AppState>('IDLE');
  
  const [progress, setProgress] = useState<ProcessingProgress>({
    processedFrames: 0, totalFrames: 0, fps: 0, currentTimestamp: 0
  });
  
  const [timelineData, setTimelineData] = useState<TimelineState | null>(null);

  // Cleanup Memory
  useEffect(() => {
    return () => {
      if (activeAsset?.previewUrl) URL.revokeObjectURL(activeAsset.previewUrl);
      if (referenceImg?.url) URL.revokeObjectURL(referenceImg.url);
    };
  }, [activeAsset, referenceImg]);

  const handleFileSelected = useCallback((file: File, url: string) => {
    if (activeAsset) URL.revokeObjectURL(activeAsset.previewUrl);
    setActiveAsset({ file, previewUrl: url });
    // We stay in IDLE until both inputs might be ready, or move to PREVIEW 
    // to let them verify the video immediately. Let's go to PREVIEW.
    setAppState('PREVIEW');
  }, [activeAsset]);

  const handleReferenceSelected = useCallback((file: File, url: string) => {
    if (referenceImg) URL.revokeObjectURL(referenceImg.url);
    setReferenceImg({ file, url });
  }, [referenceImg]);

  const handleStartProcessing = async () => {
    if (!activeAsset || !referenceImg) {
        alert("Please upload both a video and a reference image.");
        return;
    }
    
    setAppState('PROCESSING');
    
    try {
      const vision = VisionProcessor.getInstance();
      
      // Pass the Reference Image URL here
      const rawDetections = await vision.analyzeVideo(
          activeAsset, 
          referenceImg.url, 
          (p) => setProgress(p)
      );

      // Get video duration for the timeline logic
      const videoElement = document.createElement('video');
      videoElement.src = activeAsset.previewUrl;
      await new Promise(r => { videoElement.onloadedmetadata = r; });
      
      const results = TimelineManager.processDetections(rawDetections, videoElement.duration);
      
      setTimelineData(results);
      setAppState('REVIEW');
      
    } catch (error) {
      console.error("Processing failed:", error);
      alert("Error processing video. Check console.");
      setAppState('PREVIEW');
    }
  };

  const handleRemoveVideo = useCallback(() => {
    setActiveAsset(null);
    setAppState('IDLE');
    setTimelineData(null);
  }, []);

  const handleExport = () => {
    alert("FFmpeg Export Module not yet connected.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Clapperboard size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Fred<span className="text-blue-600">Butcher</span></h1>
          </div>
          <div className="text-sm text-slate-500">v1.1.0</div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {appState === 'PROCESSING' && (
          <ProcessingOverlay 
            progress={(progress.processedFrames / progress.totalFrames) * 100}
            fps={progress.fps}
            currentFrame={progress.processedFrames}
            totalFrames={progress.totalFrames}
          />
        )}

        <div className="max-w-4xl mx-auto">
          {appState === 'IDLE' && (
             <div className="space-y-6">
                 <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-900">Import Source Footage</h2>
                    <p className="text-slate-500 text-lg">Upload video and the target menu screenshot.</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Main Video Dropzone - Takes up 3 columns */}
                    <div className="md:col-span-3">
                        <VideoDropZone onFileSelected={handleFileSelected} />
                    </div>
                    {/* Sidebar for Reference Image - Takes up 1 column */}
                    <div className="md:col-span-1">
                        <ReferenceUploader 
                            imageSrc={referenceImg?.url || null} 
                            onImageSelected={handleReferenceSelected} 
                        />
                    </div>
                 </div>
             </div>
          )}

          {appState === 'PREVIEW' && activeAsset && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="flex items-start gap-6 flex-col md:flex-row">
                   <div className="flex-1 w-full">
                       <VideoPreview asset={activeAsset} onRemove={handleRemoveVideo} />
                   </div>
                   
                   {/* Mini Sidebar in Preview Mode */}
                   <div className="w-full md:w-48 shrink-0 space-y-4">
                       <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                           <h3 className="text-sm font-semibold text-slate-900 mb-3">Detection Target</h3>
                           <ReferenceUploader 
                               imageSrc={referenceImg?.url || null} 
                               onImageSelected={handleReferenceSelected} 
                           />
                           {!referenceImg && (
                               <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                                   <AlertCircle size={12} /> Required
                               </div>
                           )}
                       </div>
                       
                       <Button 
                         onClick={handleStartProcessing} 
                         disabled={!referenceImg}
                         className="w-full shadow-lg shadow-blue-600/20 py-3"
                       >
                         Process Footage
                       </Button>
                   </div>
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
      </main>
    </div>
  );
};

export default App;