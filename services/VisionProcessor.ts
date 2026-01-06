import { VideoAsset } from '../types';

declare global {
  interface Window {
    cv: any;
  }
}

export interface DetectionEvent {
  timestamp: number;
  confidence: number;
  type: 'menu_start' | 'menu_hold' | 'menu_end';
}

export interface ProcessingProgress {
  processedFrames: number;
  totalFrames: number;
  fps: number;
  currentTimestamp: number;
}

export class VisionProcessor {
  private static instance: VisionProcessor;
  private isCvLoaded: boolean = false;
  private cv: any = null;

  private constructor() {}

  public static getInstance(): VisionProcessor {
    if (!VisionProcessor.instance) {
      VisionProcessor.instance = new VisionProcessor();
    }
    return VisionProcessor.instance;
  }

  public async loadOpenCV(): Promise<void> {
    if (this.isCvLoaded && window.cv) return;
    return new Promise((resolve, reject) => {
      console.log('[VisionProcessor] Loading OpenCV.js...');
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      script.onload = () => {
        if (window.cv.getBuildInformation) {
            this.cv = window.cv;
            this.isCvLoaded = true;
            resolve();
        } else {
            window.cv.onRuntimeInitialized = () => {
                this.cv = window.cv;
                this.isCvLoaded = true;
                resolve();
            };
        }
      };
      script.onerror = () => reject(new Error('Failed to load OpenCV.js'));
      document.body.appendChild(script);
    });
  }

  // Helper to load the reference image into an OpenCV Mat
  private async loadReferenceImage(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            
            // Create Mat from image data
            const mat = this.cv.imread(canvas);
            
            // Convert to grayscale for template matching (faster/robust)
            const gray = new this.cv.Mat();
            this.cv.cvtColor(mat, gray, this.cv.COLOR_RGBA2GRAY);
            
            // Cleanup the original RGBA mat
            mat.delete();
            resolve(gray);
        };
        img.onerror = reject;
    });
  }

  public async analyzeVideo(
    asset: VideoAsset, 
    referenceImageUrl: string, // <--- NEW ARGUMENT
    onProgress: (progress: ProcessingProgress) => void
  ): Promise<DetectionEvent[]> {
    if (!this.isCvLoaded) await this.loadOpenCV();

    return new Promise(async (resolve, reject) => {
      const video = document.createElement('video');
      video.src = asset.previewUrl;
      video.muted = true;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('No Canvas Context'));

      const detections: DetectionEvent[] = [];
      const FPS_SAMPLE_RATE = 2; 

      // Load Template
      let template: any;
      try {
        template = await this.loadReferenceImage(referenceImageUrl);
      } catch (e) {
        return reject(new Error('Failed to load reference image'));
      }

      video.onloadeddata = async () => {
        // We scan at the video's native resolution to ensure pixel-perfect matching
        canvas.width = video.videoWidth; 
        canvas.height = video.videoHeight;
        
        const duration = video.duration;
        const interval = 1 / FPS_SAMPLE_RATE;
        let currentTime = 0;
        let frameCount = 0;
        const totalFramesToScan = Math.floor(duration * FPS_SAMPLE_RATE);
        
        const src = new this.cv.Mat(canvas.height, canvas.width, this.cv.CV_8UC4);
        const gray = new this.cv.Mat();
        const result = new this.cv.Mat();

        const startTime = performance.now();
        let isProcessing = true;

        const processLoop = async () => {
          if (!isProcessing) {
             src.delete(); gray.delete(); result.delete(); template.delete();
             return;
          }

          if (currentTime >= duration) {
            src.delete(); gray.delete(); result.delete(); template.delete();
            resolve(detections);
            return;
          }

          video.currentTime = currentTime;
          // Reliable seek wait
          await new Promise<void>(r => {
             const handler = () => { video.removeEventListener('seeked', handler); r(); };
             video.addEventListener('seeked', handler);
          });

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          try {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            src.data.set(imgData.data);
            
            // Convert Frame to Grayscale
            this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);

            // --- TEMPLATE MATCHING ---
            // TM_CCOEFF_NORMED: 1.0 = Perfect Match, -1.0 = Inverted, 0 = No Correlation
            this.cv.matchTemplate(gray, template, result, this.cv.TM_CCOEFF_NORMED, new this.cv.Mat());
            
            // Find the highest value in the result map
            const minMax = this.cv.minMaxLoc(result, new this.cv.Mat());
            const maxVal = minMax.maxVal; 

            if (maxVal > 0.75) { 
                detections.push({
                    timestamp: currentTime,
                    confidence: maxVal * 100,
                    type: 'menu_hold'
                });
            }

          } catch (err) {
            console.error('OpenCV Processing Error', err);
          }

          frameCount++;
          const elapsed = (performance.now() - startTime) / 1000;
          onProgress({
            processedFrames: frameCount,
            totalFrames: totalFramesToScan,
            fps: Math.round(frameCount / elapsed),
            currentTimestamp: currentTime
          });

          currentTime += interval;
          // Yield to UI thread
          setTimeout(processLoop, 0);
        };

        processLoop();
      };
      
      video.onerror = () => reject(new Error('Video Load Error'));
    });
  }
}