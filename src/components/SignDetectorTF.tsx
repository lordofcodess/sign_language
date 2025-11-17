// SignDetector with TensorFlow.js Fallback - No MediaPipe WASM errors!
import { useEffect, useRef, useState } from "react";
import {
  loadSignModel,
  SequenceBuffer,
  predictSign,
} from "../utils/modelLoader";
import { TFHandDetector } from "../utils/tfHandDetector";

interface SignDetectorProps {
  targetSign?: string;
  onSignDetected?: (sign: string, confidence: number) => void;
  onMatch?: () => void;
  confidenceThreshold?: number;
}

export default function SignDetectorTF({
  targetSign,
  onSignDetected,
  onMatch,
  confidenceThreshold = 60,
}: SignDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<any>(null);
  const [labels, setLabels] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<{
    label: string;
    confidence: number;
    top3?: Array<{ label: string; confidence: number }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);
  const [detectorReady, setDetectorReady] = useState(false);

  const detectorRef = useRef<TFHandDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sequenceBufferRef = useRef(new SequenceBuffer(30));
  const lastPredictionTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load model and labels
  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log("🔧 Initializing TensorFlow.js model...");
        const loadedModel = await loadSignModel();
        setModel(loadedModel);

        console.log("📋 Loading labels...");
        const response = await fetch("/labels.json");
        const loadedLabels = await response.json();
        setLabels(loadedLabels);

        console.log(`✅ Ready! ${loadedLabels.length} signs loaded`);
      } catch (error: any) {
        console.error("❌ Model init failed:", error);
        setError(`Failed to initialize: ${error.message}`);
      }
    };

    initializeModel();
  }, []);

  // Initialize TensorFlow.js Hand Detector
  useEffect(() => {
    if (!model || !labels.length) return;

    const initDetector = async () => {
      try {
        const detector = new TFHandDetector();
        await detector.initialize();
        detectorRef.current = detector;
        setDetectorReady(true);

        // Start FPS counter
        fpsIntervalRef.current = window.setInterval(() => {
          setFps(frameCountRef.current);
          frameCountRef.current = 0;
        }, 1000);
      } catch (err: any) {
        console.error("Detector init failed:", err);
        setError(`Detector failed: ${err.message}`);
      }
    };

    initDetector();

    return () => {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, [model, labels]);

  const processFrame = async () => {
    if (
      !detectorRef.current ||
      !videoRef.current ||
      !canvasRef.current ||
      !isRunning
    ) {
      return;
    }

    frameCountRef.current++;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    try {
      // Detect hands using TensorFlow.js
      const landmarks = await detectorRef.current.detectHands(video);

      if (landmarks && landmarks.length === 21) {
        // Draw hand landmarks
        drawHandLandmarks(ctx, landmarks);

        // Convert to flat array format
        const flatLandmarks = landmarks.flatMap((lm) => [
          lm.x / video.videoWidth,
          lm.y / video.videoHeight,
          lm.z || 0,
        ]);

        // Add to sequence buffer
        sequenceBufferRef.current.addFrame(flatLandmarks);

        // Predict every 500ms
        const now = Date.now();
        if (now - lastPredictionTimeRef.current > 500) {
          lastPredictionTimeRef.current = now;

          const result = await predictSign(
            model,
            sequenceBufferRef.current,
            labels
          );

          if (result && result.confidence > confidenceThreshold) {
            setPrediction(result);

            if (onSignDetected) {
              onSignDetected(result.label, result.confidence);
            }

            if (
              targetSign &&
              result.label.toUpperCase() === targetSign.toUpperCase()
            ) {
              if (onMatch) {
                onMatch();
              }
            }

            // Text-to-speech
            if ("speechSynthesis" in window && !targetSign) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(result.label);
              utterance.rate = 0.9;
              window.speechSynthesis.speak(utterance);
            }
          }
        }
      } else {
        // No hand detected - clear buffer after 2 seconds
        const now = Date.now();
        if (now - lastPredictionTimeRef.current > 2000) {
          sequenceBufferRef.current.clear();
          setPrediction(null);
        }
      }
    } catch (err) {
      console.error("Frame processing error:", err);
    }

    // Continue processing
    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  };

  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: Array<{ x: number; y: number; z?: number }>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw connections
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // Thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // Index
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // Middle
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // Ring
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // Pinky
      [5, 9],
      [9, 13],
      [13, 17], // Palm
    ];

    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];

      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    });

    // Draw landmarks
    ctx.fillStyle = "#FF0000";
    landmarks.forEach((lm) => {
      ctx.beginPath();
      ctx.arc(lm.x, lm.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Auto-start camera
  useEffect(() => {
    if (model && labels.length && detectorReady && !isRunning) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [model, labels, detectorReady]);

  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      streamRef.current = stream;
      setIsRunning(true);

      // Start processing frames
      processFrame();

      console.log("✅ Camera started with TensorFlow.js");
    } catch (error: any) {
      console.error("❌ Camera error:", error);
      setError(`Camera failed: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRunning(false);
    sequenceBufferRef.current.clear();
    setPrediction(null);
  };

  if (error) {
    return (
      <div className="bg-red-100 border-2 border-red-500 rounded-xl p-6">
        <h3 className="text-red-800 font-bold text-xl mb-2">❌ Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!model || !labels.length || !detectorReady) {
    return (
      <div className="bg-blue-100 border-2 border-blue-500 rounded-xl p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin text-4xl">🔄</div>
          <p className="text-blue-800 font-semibold text-lg">
            Loading TensorFlow.js model...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera Feed with Canvas Overlay */}
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-0"
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="relative w-full h-auto"
        />

        {/* FPS Counter */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-mono">
          {fps} FPS
        </div>

        {/* Buffer Status */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-mono">
          Buffer: {sequenceBufferRef.current.buffer.length}/30
        </div>

        {/* TensorFlow.js Badge */}
        <div className="absolute bottom-4 right-4 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold">
          TensorFlow.js
        </div>

        {/* Target Sign Indicator */}
        {targetSign && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full font-bold text-lg shadow-lg">
            Target: <span className="text-2xl ml-2">{targetSign}</span>
          </div>
        )}
      </div>

      {/* Prediction Display */}
      {prediction && !targetSign && (
        <div className="rounded-xl p-6 border-2 bg-blue-100 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Detected Sign:</p>
              <h2 className="text-4xl font-bold">{prediction.label}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Confidence:</p>
              <p className="text-4xl font-bold">{prediction.confidence}%</p>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                prediction.confidence >= 80
                  ? "bg-green-500"
                  : prediction.confidence >= 60
                  ? "bg-yellow-500"
                  : "bg-orange-500"
              }`}
              style={{ width: `${prediction.confidence}%` }}
            />
          </div>

          {/* Top 3 Predictions */}
          {prediction.top3 && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Top 3 Predictions:
              </p>
              <ol className="space-y-1">
                {prediction.top3.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-sm">
                    <span>
                      {idx + 1}. {item.label}
                    </span>
                    <span className="font-mono">{item.confidence}%</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {!targetSign && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">💡 Tips:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Keep your hand clearly visible in the camera</li>
            <li>• For dynamic signs (Z, J), perform the full motion</li>
            <li>• Wait for confidence above {confidenceThreshold}%</li>
            <li>• Ensure good lighting for better accuracy</li>
            <li>✨ Using TensorFlow.js - No WASM errors!</li>
          </ul>
        </div>
      )}
    </div>
  );
}
