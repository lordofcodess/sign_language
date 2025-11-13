/**
 * Load TensorFlow.js Layers Model (LSTM for sequences)
 */
import * as tf from "@tensorflow/tfjs";

export async function loadSignModel() {
  console.log("📂 Loading LSTM model...");

  try {
    // Use loadLayersModel for LSTM models (not loadGraphModel)
    const model = await tf.loadLayersModel("/assets/web_model/model.json");

    console.log("✅ Model loaded successfully");
    console.log(`   Input: ${model.inputs[0].shape}`);
    console.log(`   Output: ${model.outputs[0].shape}`);
    console.log(
      `   Expected input: [batch, 30, 63] (30 frames × 63 landmarks)`
    );

    return model;
  } catch (error) {
    console.error("❌ Failed to load model:", error);
    console.error("   Make sure you ran: python export_hybrid_model.py");
    console.error(
      "   And copied files: xcopy /E /I web_model ..\\web\\public\\assets\\web_model"
    );
    throw new Error(`Model loading failed: ${error.message}`);
  }
}

export class SequenceBuffer {
  /**
   * Buffers hand landmarks over time for sequence detection
   */
  constructor(maxLength = 30) {
    this.maxLength = maxLength;
    this.buffer = [];
  }

  addFrame(landmarks) {
    if (!landmarks || landmarks.length !== 63) {
      return;
    }

    this.buffer.push([...landmarks]);

    // Keep only last maxLength frames
    if (this.buffer.length > this.maxLength) {
      this.buffer.shift();
    }
  }

  getSequence() {
    if (this.buffer.length === 0) {
      return null;
    }

    let sequence = [...this.buffer];

    // Pad if needed (repeat last frame)
    while (sequence.length < this.maxLength) {
      const lastFrame = sequence[sequence.length - 1] || new Array(63).fill(0);
      sequence.push([...lastFrame]);
    }

    return sequence;
  }

  clear() {
    this.buffer = [];
  }

  isFull() {
    return this.buffer.length >= this.maxLength;
  }
}

export function preprocessHandLandmarks(landmarks) {
  /**
   * Convert MediaPipe hand landmarks to flat array
   * Input: 21 hand points with {x, y, z}
   * Output: 63 values [x,y,z × 21 points]
   */
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  try {
    const flatLandmarks = [];
    for (let i = 0; i < 21; i++) {
      const point = landmarks[i];
      flatLandmarks.push(point.x || 0, point.y || 0, point.z || 0);
    }

    return flatLandmarks;
  } catch (error) {
    console.error("❌ Preprocessing failed:", error);
    return null;
  }
}

export async function predictSign(model, sequenceBuffer, labels) {
  /**
   * Predict sign from sequence of landmarks
   * Returns: { label, confidence, allPredictions }
   */
  let input = null;
  let predictions = null;

  try {
    const sequence = sequenceBuffer.getSequence();
    if (!sequence) {
      return null;
    }

    // Create tensor [1, 30, 63]
    input = tf.tensor3d([sequence], [1, 30, 63]);

    // Run prediction
    predictions = model.predict(input);
    const predArray = await predictions.data();
    const probs = Array.from(predArray);

    // Get top prediction
    const maxIdx = probs.indexOf(Math.max(...probs));
    const confidence = probs[maxIdx];
    const label = labels[maxIdx] || "?";

    // Get top 3 predictions
    const topIndices = probs
      .map((prob, idx) => ({ prob, idx }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3);

    const top3 = topIndices.map((item) => ({
      label: labels[item.idx],
      confidence: (item.prob * 100).toFixed(1),
    }));

    return {
      label,
      confidence: (confidence * 100).toFixed(1),
      top3,
      allPredictions: probs,
    };
  } catch (error) {
    console.error("❌ Prediction failed:", error);
    return null;
  } finally {
    // Cleanup tensors
    if (input) input.dispose();
    if (predictions) predictions.dispose();
  }
}
