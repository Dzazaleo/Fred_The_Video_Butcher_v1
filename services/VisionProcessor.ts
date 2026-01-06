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

/**
 * Singleton service to handle OpenCV loading and Video Processing logic
 */
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

  /**
   * Injects the OpenCV.js script into the DOM if not already present
   */
  public async loadOpenCV(): Promise<void> {
    if (this.isCvLoaded && window.cv) return;

    return new Promise((resolve, reject) => {
      // Check if script is already injected
      if (document.querySelector('script[src*="opencv.js"]')) {
        if (window.cv && window.cv.Mat) {
            this.cv = window.cv;
            this.isCvLoaded = true;
            resolve();
            return;
        }
      }

      console.log('[VisionProcessor] Loading OpenCV.js...');
      const script = document.createElement('script');
      // Using a reliable CDN for opencv.js 4.8.0
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      script.onload = () => {
        // OpenCV.js loads async; we need to wait for the runtime to initialize
        if (window.cv.getBuildInformation) {
            console.log('[VisionProcessor] OpenCV loaded immediately.');
            this.cv = window.cv;
            this.isCvLoaded = true;
            resolve();
        } else {
            // Wait for onRuntimeInitialized
            window.cv.onRuntimeInitialized = () => {
                console.log('[VisionProcessor] OpenCV Runtime Initialized.');
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

  /**
   * The "Brain" + "Eyes": Scans the video for the specific visual fingerprint
   */
  public async analyzeVideo(
    asset: VideoAsset, 
    onProgress: (progress: ProcessingProgress) => void
  ): Promise<DetectionEvent[]> {
    if (!this.isCvLoaded) await this.loadOpenCV();

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = asset.previewUrl;
      video.muted = true;
      video.playsInline = true;
      
      // Hidden canvas for frame extraction
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }

      const detections: DetectionEvent[] = [];
      const FPS_SAMPLE_RATE = 2; // Check 2 frames per second (high performance)
      let isProcessing = true;

      video.onloadeddata = async () => {
        // Resize for speed (Analysis doesn't need 4K)
        const processWidth = 480;
        const aspectRatio = video.videoWidth / video.videoHeight;
        const processHeight = Math.floor(processWidth / aspectRatio);

        canvas.width = processWidth;
        canvas.height = processHeight;
        
        const duration = video.duration;
        const interval = 1 / FPS_SAMPLE_RATE;
        let currentTime = 0;
        let frameCount = 0;
        const totalFramesToScan = Math.floor(duration * FPS_SAMPLE_RATE) || 1;
        
        const startTime = performance.now();

        // Memory Management: Pre-allocate OpenCV Matrices
        // NOTE: We use specific types for efficiency
        const src = new this.cv.Mat(processHeight, processWidth, this.cv.CV_8UC4);
        const hsv = new this.cv.Mat(processHeight, processWidth, this.cv.CV_8UC3);
        const mask = new this.cv.Mat(processHeight, processWidth, this.cv.CV_8UC1);
        const kernel = this.cv.Mat.ones(5, 5, this.cv.CV_8U); // Kernel for morphological ops
        
        // --- DETECTION PARAMETERS (The "Fingerprint" Logic) ---
        // Range for the deep blue/purple menu background
        // OpenCV HSV ranges: H: 0-180, S: 0-255, V: 0-255
        // "Menu Purple" is approx Hue 240-270deg => 120-135 in OpenCV scale
        const lowerPurple = new this.cv.Mat(processHeight, processWidth, this.cv.CV_8UC3, [110, 50, 20, 0]);
        const upperPurple = new this.cv.Mat(processHeight, processWidth, this.cv.CV_8UC3, [150, 255, 255, 0]);

        const processLoop = async () => {
          if (!isProcessing) {
             // Cleanup on abort
             src.delete(); hsv.delete(); mask.delete(); kernel.delete(); lowerPurple.delete(); upperPurple.delete();
             return;
          }

          if (currentTime >= duration) {
            // Cleanup on finish
            src.delete(); hsv.delete(); mask.delete(); kernel.delete(); lowerPurple.delete(); upperPurple.delete();
            resolve(detections);
            return;
          }

          // Seek to time
          video.currentTime = currentTime;
          
          // Wait for seek to complete
          await new Promise<void>(r => {
             const handler = () => {
               video.removeEventListener('seeked', handler);
               r();
             };
             video.addEventListener('seeked', handler);
          });

          // Draw frame to canvas (downscaled)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // --- OPENCV PIPELINE ---
          try {
            // 1. Read from Canvas
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            src.data.set(imgData.data);

            // 2. Convert to HSV
            this.cv.cvtColor(src, hsv, this.cv.COLOR_RGBA2RGB);
            this.cv.cvtColor(hsv, hsv, this.cv.COLOR_RGB2HSV);

            // 3. Color Thresholding (The "Purple Box" logic)
            // This ignores text because text (white) has low Saturation, falling outside the mask
            this.cv.inRange(hsv, lowerPurple, upperPurple, mask);

            // 4. Morphology (Filling the holes)
            // The text creates "holes" in our purple box. We "close" them.
            this.cv.morphologyEx(mask, mask, this.cv.MORPH_CLOSE, kernel);

            // 5. Contour Analysis
            const contours = new this.cv.MatVector();
            const hierarchy = new this.cv.Mat();
            this.cv.findContours(mask, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE);

            let maxArea = 0;
            let foundMenu = false;

            // Check if we have a massive rectangular blob in the center
            for (let i = 0; i < contours.size(); ++i) {
                const contour = contours.get(i);
                const area = this.cv.contourArea(contour);
                
                // Heuristics:
                // 1. Area must be significant (e.g., > 15% of screen)
                const imgArea = canvas.width * canvas.height;
                if (area > (imgArea * 0.15)) {
                    maxArea = Math.max(maxArea, area);
                    foundMenu = true; 
                }
            }

            if (foundMenu) {
                detections.push({
                    timestamp: currentTime,
                    confidence: (maxArea / (canvas.width * canvas.height)) * 100, // Normalized confidence
                    type: 'menu_hold'
                });
            }

            contours.delete();
            hierarchy.delete();

          } catch (err) {
            console.error('OpenCV Processing Error', err);
          }

          // Progress Update
          frameCount++;
          const elapsed = (performance.now() - startTime) / 1000;
          onProgress({
            processedFrames: frameCount,
            totalFrames: totalFramesToScan,
            fps: elapsed > 0 ? Math.round(frameCount / elapsed) : 0,
            currentTimestamp: currentTime
          });

          // Next Step
          currentTime += interval;
          // Use setTimeout to allow UI thread to breathe
          setTimeout(processLoop, 0);
        };

        processLoop();
      };
      
      video.onerror = () => reject(new Error('Error loading video for processing'));
    });
  }
}