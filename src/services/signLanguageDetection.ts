import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { GSLSignRecognizer, preprocessHandLandmarks, SequenceBuffer } from './gsl-sign-recognizer';

export interface DetectionResult {
  label: string;
  confidence: number;
  top3?: Array<{ label: string; confidence: string }>;
}

export class SignLanguageDetector {
  private recognizer: GSLSignRecognizer;
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private isInitialized = false;
  private pendingResolve: ((value: number[] | null) => void) | null = null;
  private lastPredictionTime = 0;
  private isPredicting = false;
  private predictionCallback: ((result: DetectionResult | null) => void) | null = null;
  private canvasCallback: ((canvas: HTMLCanvasElement) => void) | null = null;
  private frameCount = 0;
  private fpsCallback: ((fps: number) => void) | null = null;
  private fpsInterval: number | null = null;

  /**
   * Initialize the detector by loading the model and labels
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize GSL Sign Recognizer
      this.recognizer = new GSLSignRecognizer({
        modelPath: '/assets/web_model/model.json',
        labelsPath: '/labels.json'
      });

      await this.recognizer.init();
      console.log('✅ GSL Sign Recognizer initialized');

      // Initialize MediaPipe Hands
      this.hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Use simpler model for better performance and detection
        minDetectionConfidence: 0.3, // Lower threshold to detect hands more easily
        minTrackingConfidence: 0.3, // Lower threshold for tracking
      });

      // Set up results callback - this runs on EVERY frame from MediaPipe
      this.hands.onResults((results) => {
        // Handle pending resolve for extractLandmarks (backward compatibility)
        if (this.pendingResolve) {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const features = preprocessHandLandmarks(landmarks);
            this.pendingResolve(features);
          } else {
            this.pendingResolve(null);
          }
          this.pendingResolve = null;
        }

        // Draw hand landmarks on canvas if callback is set
        if (this.canvasCallback && results.image) {
          const canvas = document.createElement('canvas');
          canvas.width = results.image.width || 640;
          canvas.height = results.image.height || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            
            // Draw hand landmarks using MediaPipe drawing utilities
            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              const landmarks = results.multiHandLandmarks[0];
              
              // Draw hand connections (skeleton)
              drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 3,
              });
              
              // Draw hand landmarks (points)
              drawLandmarks(ctx, landmarks, {
                color: '#FF0000',
                lineWidth: 2,
                radius: 5,
              });
            }
            this.canvasCallback(canvas);
          }
        }
        
        // Increment frame count for FPS tracking
        this.frameCount++;

        // Real-time detection: process every frame
        this.processMediaPipeResults(results);
      });

      this.isInitialized = true;
      console.log('Sign Language Detector initialized');
    } catch (error) {
      console.error('Error initializing detector:', error);
      throw new Error('Failed to initialize sign language detector');
    }
  }

  /**
   * Start camera using MediaPipe Camera utility
   * This provides better camera handling and automatic frame processing
   */
  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.hands || !this.isInitialized) {
      throw new Error('Detector not initialized');
    }

    if (this.camera) {
      // Camera already running
      return;
    }

    try {
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.hands && videoElement) {
            await this.hands.send({ image: videoElement });
          }
        },
        width: 640,
        height: 480,
      });

      await this.camera.start();
      console.log('✅ Camera started with MediaPipe Camera utility');
      
      // Start FPS tracking
      this.startFpsTracking();
    } catch (error) {
      console.error('Error starting camera:', error);
      throw error;
    }
  }

  /**
   * Stop camera
   */
  stopCamera(): void {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
      console.log('Camera stopped');
    }
    
    // Stop FPS tracking
    this.stopFpsTracking();
  }

  /**
   * Start FPS tracking
   */
  private startFpsTracking(): void {
    this.stopFpsTracking(); // Clear any existing interval
    
    this.fpsInterval = window.setInterval(() => {
      if (this.fpsCallback) {
        this.fpsCallback(this.frameCount);
      }
      this.frameCount = 0; // Reset counter
    }, 1000); // Update every second
  }

  /**
   * Stop FPS tracking
   */
  private stopFpsTracking(): void {
    if (this.fpsInterval !== null) {
      clearInterval(this.fpsInterval);
      this.fpsInterval = null;
    }
    this.frameCount = 0;
  }

  /**
   * Set FPS callback
   */
  setFpsCallback(callback: (fps: number) => void): void {
    this.fpsCallback = callback;
  }

  /**
   * Send frame to MediaPipe for processing (for backward compatibility)
   * This triggers the onResults callback which handles real-time detection
   */
  async sendFrameToMediaPipe(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.hands || !this.isInitialized) {
      return;
    }

    // Check if video is ready and has valid dimensions
    if (videoElement.readyState !== 4) {
      return;
    }

    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
      return;
    }

    try {
      // Send video element directly to MediaPipe
      await this.hands.send({ image: videoElement });
    } catch (error) {
      console.error('Error sending frame to MediaPipe:', error);
    }
  }

  /**
   * Extract hand landmarks from a video frame (for backward compatibility)
   */
  private async extractLandmarks(videoElement: HTMLVideoElement): Promise<number[] | null> {
    if (!this.hands || !this.isInitialized) {
      console.warn('MediaPipe not initialized');
      return null;
    }

    // Check if video is ready and has valid dimensions
    if (videoElement.readyState !== 4) {
      return null;
    }

    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
      console.warn('Video dimensions not available', { videoWidth, videoHeight });
      return null;
    }

    return new Promise((resolve) => {
      // Store the resolve function to be called by onResults
      this.pendingResolve = resolve;

      // Create a canvas to capture the video frame
      const canvas = document.createElement('canvas');
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas context');
        resolve(null);
        return;
      }

      try {
        // Draw the current video frame to canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Send canvas to MediaPipe
        this.hands!.send({ image: canvas });
      } catch (error) {
        console.error('Error drawing to canvas or sending to MediaPipe:', error);
        this.pendingResolve = null;
        resolve(null);
        return;
      }

      // Timeout after 2 seconds if no response (increased for slower devices)
      setTimeout(() => {
        if (this.pendingResolve === resolve) {
          console.warn('MediaPipe timeout - no hand detected');
          this.pendingResolve = null;
          resolve(null);
        }
      }, 2000);
    });
  }

  /**
   * Process MediaPipe results - called on every frame
   * This is the main real-time detection loop
   */
  private processMediaPipeResults(results: any): void {
    if (!this.isInitialized || !this.recognizer) {
      return;
    }

    // FPS is calculated in the frontend from frame sending rate

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const flatLandmarks = preprocessHandLandmarks(landmarks);

      if (flatLandmarks) {
        // CRITICAL: Add frame to buffer on EVERY detection
        this.recognizer.addFrame(flatLandmarks);

        // Throttle predictions: run every 500ms (not on every frame)
        const now = Date.now();
        if (now - this.lastPredictionTime > 500 && !this.isPredicting) {
          this.lastPredictionTime = now;
          this.isPredicting = true;

          // Run prediction asynchronously (don't block frame processing)
          this.recognizer.predict(null, 30).then(result => {
            this.isPredicting = false;

            if (result && this.predictionCallback) {
              const detectionResult: DetectionResult = {
                label: result.label,
                confidence: parseFloat(result.confidence) / 100,
                top3: result.top3, // Include top 3 predictions
              };
              this.predictionCallback(detectionResult);
            } else if (this.predictionCallback) {
              this.predictionCallback(null);
            }
          }).catch(error => {
            this.isPredicting = false;
            console.error('Prediction error:', error);
            if (this.predictionCallback) {
              this.predictionCallback(null);
            }
          });
        }
      }
    } else {
      // No hand detected - clear buffer after 2 seconds of no detection
      const now = Date.now();
      if (now - this.lastPredictionTime > 2000 && this.recognizer.getBufferLength() > 0) {
        this.recognizer.clear();
        if (this.predictionCallback) {
          this.predictionCallback(null);
        }
      }
    }
  }

  /**
   * Process a video frame and add to buffer (for backward compatibility)
   * Returns true if buffer has enough frames for prediction
   */
  async processFrame(videoElement: HTMLVideoElement): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const landmarks = await this.extractLandmarks(videoElement);

    if (landmarks && landmarks.length === 63) {
      // Add frame to recognizer's buffer
      this.recognizer.addFrame(landmarks);
      return this.recognizer.isBufferFull();
    } else {
      // Log when no landmarks are detected (for debugging)
      if (this.recognizer.getBufferLength() === 0) {
        // Only log occasionally to avoid spam
        if (Math.random() < 0.1) {
          console.log('No hand detected in frame. Make sure your hand is visible in the camera.');
        }
      }
    }

    return false;
  }

  /**
   * Predict the sign language gesture from the current buffer (real-time)
   * Works with sliding window - makes predictions continuously
   */
  async predict(): Promise<DetectionResult | null> {
    if (!this.isInitialized || !this.recognizer.getIsReady()) {
      return null;
    }

    try {
      const result = await this.recognizer.predict(null, 30); // 30% min confidence

      if (result) {
        return {
          label: result.label,
          confidence: parseFloat(result.confidence) / 100, // Convert to 0-1 range
        };
      }

      return null;
    } catch (error) {
      console.error('Prediction error:', error);
      return null;
    }
  }

  /**
   * Get the latest prediction without processing a new frame (for real-time updates)
   */
  async getLatestPrediction(): Promise<DetectionResult | null> {
    return this.predict();
  }

  /**
   * Clear the frame buffer
   */
  clearBuffer(): void {
    if (this.recognizer) {
      this.recognizer.clear();
    }
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.recognizer ? this.recognizer.getBufferLength() : 0;
  }

  /**
   * Set callback for real-time predictions
   * @param callback - Function to call with prediction results
   */
  setPredictionCallback(callback: (result: DetectionResult | null) => void): void {
    this.predictionCallback = callback;
  }

  /**
   * Set callback for canvas updates (for hand detection visualization)
   * @param callback - Function to call with canvas element
   */
  setCanvasCallback(callback: (canvas: HTMLCanvasElement) => void): void {
    this.canvasCallback = callback;
  }

  /**
   * Check if detector is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.recognizer?.getIsReady() === true;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopCamera();
    
    if (this.recognizer) {
      this.recognizer.clear();
    }
    if (this.hands) {
      this.hands.close();
      this.hands = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
let detectorInstance: SignLanguageDetector | null = null;

export const getSignLanguageDetector = (): SignLanguageDetector => {
  if (!detectorInstance) {
    detectorInstance = new SignLanguageDetector();
  }
  return detectorInstance;
};

