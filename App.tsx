import React, { useState, useEffect, useCallback } from 'react';
import { VideoDropZone } from './components/VideoDropZone';
import { VideoPreview } from './components/VideoPreview';
import { VideoAsset } from './types';
import { Clapperboard } from 'lucide-react';

const App: React.FC = () => {
  const [activeAsset, setActiveAsset] = useState<VideoAsset | null>(null);

  // Critical Memory Management: Cleanup object URL when component unmounts or asset changes
  useEffect(() => {
    return () => {
      if (activeAsset?.previewUrl) {
        URL.revokeObjectURL(activeAsset.previewUrl);
        console.log(`[Memory] Revoked URL: ${activeAsset.previewUrl}`);
      }
    };
  }, [activeAsset]);

  const handleFileSelected = useCallback((file: File, url: string) => {
    // If there is an existing asset, cleanup its URL before setting the new one
    // Note: The useEffect cleanup runs AFTER the render cycle for the previous state. 
    // However, explicitly revoking here if we were replacing immediately ensures we don't hold two references 
    // during the state transition if React batches strangely, though useEffect is generally sufficient.
    // For strictness per requirements:
    if (activeAsset) {
      URL.revokeObjectURL(activeAsset.previewUrl);
    }
    
    setActiveAsset({ file, previewUrl: url });
  }, [activeAsset]);

  const handleRemoveVideo = useCallback(() => {
    setActiveAsset(null); // This will trigger the useEffect cleanup
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <Clapperboard size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Studio<span className="text-blue-600">Ingest</span></h1>
          </div>
          <div className="text-sm text-slate-500">v1.0.0</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">
              {activeAsset ? 'Review Footage' : 'Import Source Footage'}
            </h2>
            <p className="text-slate-500 text-lg">
              {activeAsset 
                ? 'Review the uploaded clip before processing.' 
                : 'Upload your raw video files to begin the ingestion workflow.'}
            </p>
          </div>

          <div className="mt-8 transition-all duration-300">
            {activeAsset ? (
              <VideoPreview asset={activeAsset} onRemove={handleRemoveVideo} />
            ) : (
              <VideoDropZone onFileSelected={handleFileSelected} />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} StudioIngest Module. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;