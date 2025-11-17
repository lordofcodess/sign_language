// SignDetector - Exact copy of working WebcamDetector with TypeScript + Practice mode props
import { useEffect, useRef, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import {
  loadSignModel,
  SequenceBuffer,
  preprocessHandLandmarks,
  predictSign,
} from "../utils/modelLoader";

interface SignDetectorProps {
  targetSign?: string;
  onSignDetected?: (sign: string, confidence: number) => void;
  onMatch?: () => void;
  confidenceThreshold?: number;
}

export default function SignDetector({
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

  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const sequenceBufferRef = useRef(new SequenceBuffer(30));
  const lastPredictionTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef<number | null>(null);

  // Load model and labels
  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log("🔧 Initializing model...");
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

  // Initialize MediaPipe Hands - EXACT copy from WebcamDetector
  useEffect(() => {
    if (!model || !labels.length) return;

    const hands = new Hands({
      locateFile: (file) => {
        return `/node_modules/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    // Start FPS counter
    fpsIntervalRef.current = window.setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    return () => {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
    };
  }, [model, labels]);

  const onResults = async (results: any) => {
    frameCountRef.current++;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks[0]) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw hand skeleton
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 3,
      });
      drawLandmarks(ctx, landmarks, {
        color: "#FF0000",
        lineWidth: 2,
        radius: 5,
      });

      // Convert to flat array
      const flatLandmarks = preprocessHandLandmarks(landmarks);

      if (flatLandmarks) {
        // Add to sequence buffer
        sequenceBufferRef.current.addFrame(flatLandmarks);

        // Predict every 500ms (2 predictions per second)
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

            // Notify parent component
            if (onSignDetected) {
              onSignDetected(result.label, result.confidence);
            }

            // Check for match with target sign
            if (
              targetSign &&
              result.label.toUpperCase() === targetSign.toUpperCase()
            ) {
              if (onMatch) {
                onMatch();
              }
            }

            // Text-to-speech (only in non-practice mode)
            if ("speechSynthesis" in window && !targetSign) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(result.label);
              utterance.rate = 0.9;
              window.speechSynthesis.speak(utterance);
            }
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
  };

  // Auto-start camera when component mounts (matching WebcamDetector)
  useEffect(() => {
    if (model && labels.length && !isRunning) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [model, labels]);

  const startCamera = async () => {
    if (!videoRef.current || !handsRef.current) return;

    try {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 600,
        height: 350,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsRunning(true);
      console.log("✅ Camera started");
    } catch (error: any) {
      console.error("❌ Camera error:", error);
      setError(`Camera failed: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
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

  if (!model || !labels.length) {
    return (
      <div className="bg-blue-100 border-2 border-blue-500 rounded-xl p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin text-4xl">🔄</div>
          <p className="text-blue-800 font-semibold text-lg">
            Loading model and labels...
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
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="relative w-full h-auto"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* FPS Counter */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-mono">
          {fps} FPS
        </div>

        {/* Buffer Status */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-mono">
          Buffer: {sequenceBufferRef.current.buffer.length}/30
        </div>
      </div>

      {/* Prediction Display - Only show in non-practice mode or show minimal info */}
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

      {/* Tips - Only show in non-practice mode */}
      {!targetSign && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">💡 Tips:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Keep your hand clearly visible in the camera</li>
            <li>• For dynamic signs (Z, J), perform the full motion</li>
            <li>• Wait for confidence above {confidenceThreshold}%</li>
            <li>• Ensure good lighting for better accuracy</li>
          </ul>
        </div>
      )}
    </div>
  );
}
