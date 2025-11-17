import * as tf from "@tensorflow/tfjs";

export class SequenceBuffer {
  public buffer: number[][] = [];
  private maxLength: number;

  constructor(maxLength: number = 30) {
    this.maxLength = maxLength;
  }

  addFrame(landmarks: number[]) {
    this.buffer.push(landmarks);
    if (this.buffer.length > this.maxLength) {
      this.buffer.shift(); // Remove oldest frame
    }
  }

  isFull(): boolean {
    return this.buffer.length === this.maxLength;
  }

  clear() {
    this.buffer = [];
  }

  getSequence(): number[][] {
    return this.buffer;
  }
}

export async function loadSignModel() {
  try {
    console.log("🔧 Loading TensorFlow.js model...");
    // Fixed path - model is in public/assets/web_model/
    const model = await tf.loadLayersModel("/assets/web_model/model.json");
    console.log("✅ Model loaded successfully");
    return model;
  } catch (error) {
    console.error("❌ Failed to load model:", error);
    throw error;
  }
}

export function preprocessHandLandmarks(landmarks: any[]): number[] | null {
  try {
    // Flatten landmarks to [x1, y1, z1, x2, y2, z2, ...]
    const flatLandmarks: number[] = [];
    
    for (const landmark of landmarks) {
      flatLandmarks.push(
        landmark.x || 0,
        landmark.y || 0,
        landmark.z || 0
      );
    }

    // Should have 21 landmarks * 3 coordinates = 63 values
    if (flatLandmarks.length !== 63) {
      console.warn(`Expected 63 values, got ${flatLandmarks.length}`);
      return null;
    }

    return flatLandmarks;
  } catch (error) {
    console.error("Error preprocessing landmarks:", error);
    return null;
  }
}

export async function predictSign(
  model: tf.LayersModel,
  sequenceBuffer: SequenceBuffer,
  labels: string[]
): Promise<{
  label: string;
  confidence: number;
  top3: Array<{ label: string; confidence: number }>;
} | null> {
  if (!sequenceBuffer.isFull()) {
    return null;
  }

  try {
    const sequence = sequenceBuffer.getSequence();
    
    // Convert to tensor: [1, 30, 63]
    const inputTensor = tf.tensor3d([sequence]);

    // Make prediction
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const probabilities = await prediction.data();
    
    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();

    // Get top prediction
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const confidence = Math.round(probabilities[maxIndex] * 100);

    // Get top 3 predictions
    const indexedProbs = Array.from(probabilities).map((prob, idx) => ({
      index: idx,
      probability: prob,
    }));
    
    indexedProbs.sort((a, b) => b.probability - a.probability);
    
    const top3 = indexedProbs.slice(0, 3).map((item) => ({
      label: labels[item.index] || "Unknown",
      confidence: Math.round(item.probability * 100),
    }));

    return {
      label: labels[maxIndex] || "Unknown",
      confidence,
      top3,
    };
  } catch (error) {
    console.error("Prediction error:", error);
    return null;
  }
}