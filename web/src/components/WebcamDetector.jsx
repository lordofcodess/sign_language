// WebcamDetector - MediaPipe Hands + TF.js inference component
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

export default function WebcamDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [model, setModel] = useState(null);
  const [labels, setLabels] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fps, setFps] = useState(0);

  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const sequenceBufferRef = useRef(new SequenceBuffer(30));
  const lastPredictionTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsIntervalRef = useRef(null);

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
      } catch (error) {
        console.error("❌ Model init failed:", error);
        setError(`Failed to initialize: ${error.message}`);
      }
    };

    initializeModel();
  }, []);

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (!model || !labels.length) return;

    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    // Start FPS counter
    fpsIntervalRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);

    return () => {
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
    };
  }, [model, labels]);

  const onResults = async (results) => {
    frameCountRef.current++;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
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

          if (result && result.confidence > 60) {
            setPrediction(result);

            // Text-to-speech
            if ("speechSynthesis" in window) {
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

  const startCamera = async () => {
    if (!videoRef.current || !handsRef.current) return;

    try {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsRunning(true);
      console.log("✅ Camera started");
    } catch (error) {
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

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "20px" }}>🇬🇭 GSL Sign Detection</h2>

      {error && (
        <div
          style={{
            background: "#fee",
            border: "2px solid #c00",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          ❌ {error}
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        {!isRunning ? (
          <button
            onClick={startCamera}
            disabled={!model || !labels.length}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            📹 Start Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            style={{
              padding: "12px 24px",
              fontSize: "16px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            ⏹️ Stop Camera
          </button>
        )}

        <span style={{ marginLeft: "20px", color: "#666" }}>
          FPS: {fps} | Buffer: {sequenceBufferRef.current.buffer.length}/30
        </span>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}
      >
        <div>
          <h3>Camera Feed</h3>
          <video
            ref={videoRef}
            style={{
              width: "100%",
              border: "3px solid #333",
              borderRadius: "8px",
            }}
          />
        </div>

        <div>
          <h3>Hand Detection</h3>
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            style={{
              width: "100%",
              border: "3px solid #28a745",
              borderRadius: "8px",
            }}
          />
        </div>
      </div>

      {prediction && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            background: "#d4edda",
            border: "2px solid #28a745",
            borderRadius: "8px",
          }}
        >
          <h2 style={{ margin: "0 0 10px 0", color: "#155724" }}>
            Sign: {prediction.label}
          </h2>
          <p style={{ margin: "5px 0", fontSize: "18px" }}>
            Confidence: {prediction.confidence}%
          </p>

          {prediction.top3 && (
            <div style={{ marginTop: "15px" }}>
              <strong>Top 3 Predictions:</strong>
              <ol style={{ marginTop: "5px" }}>
                {prediction.top3.map((item, idx) => (
                  <li key={idx}>
                    {item.label}: {item.confidence}%
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <h4>💡 Tips:</h4>
        <ul>
          <li>Keep your hand clearly visible in the camera</li>
          <li>For dynamic signs (Z, J), perform the full motion</li>
          <li>Model processes 30 frames (~2 seconds) for each prediction</li>
          <li>Wait for confidence above 60% for reliable results</li>
        </ul>
      </div>
    </div>
  );
}
