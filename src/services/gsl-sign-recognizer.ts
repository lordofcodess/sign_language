/**
 * GSL Sign Recognizer - Standalone TensorFlow.js Module
 * Works with any web application (React, Vue, Vanilla JS, etc.)
 * 
 * Usage:
 *   const recognizer = new GSLSignRecognizer({
 *     modelPath: '/assets/web_model/model.json',
 *     labelsPath: '/labels.json'
 *   });
 *   await recognizer.init();
 *   const result = await recognizer.predict(sequenceBuffer);
 */

import * as tf from '@tensorflow/tfjs';

export class SequenceBuffer {
  /**
   * Buffers hand landmarks over time for sequence detection
   */
  constructor(maxLength = 30) {
    this.maxLength = maxLength;
    this.buffer = [];
  }

  addFrame(landmarks: number[]) {
    if (!landmarks || landmarks.length !== 63) {
      return;
    }
    this.buffer.push([...landmarks]);
    // Keep only last maxLength frames
    if (this.buffer.length > this.maxLength) {
      this.buffer.shift();
    }
  }

  getSequence(): number[][] | null {
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

  isFull(): boolean {
    return this.buffer.length >= this.maxLength;
  }

  getLength(): number {
    return this.buffer.length;
  }
}

export function preprocessHandLandmarks(landmarks: any[]): number[] | null {
  /**
   * Convert MediaPipe hand landmarks to flat array
   * Input: 21 hand points with {x, y, z}
   * Output: 63 values [x,y,z × 21 points]
   */
  if (!landmarks || landmarks.length < 21) {
    return null;
  }

  try {
    const flatLandmarks: number[] = [];
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

export interface PredictionResult {
  label: string;
  confidence: string;
  top3: Array<{ label: string; confidence: string }>;
  allPredictions: string[];
}

export class GSLSignRecognizer {
  private modelPath: string;
  private labelsPath: string;
  private model: tf.LayersModel | null = null;
  private labels: string[] = [];
  private isInitialized: boolean = false;
  private sequenceBuffer: SequenceBuffer;

  /**
   * GSL Sign Recognition using TensorFlow.js
   * 
   * @param config - Configuration options
   * @param config.modelPath - Path to model.json file
   * @param config.labelsPath - Path to labels.json file
   */
  constructor(config: { modelPath?: string; labelsPath?: string } = {}) {
    this.modelPath = config.modelPath || '/assets/web_model/model.json';
    this.labelsPath = config.labelsPath || '/labels.json';
    this.model = null;
    this.labels = [];
    this.isInitialized = false;
    this.sequenceBuffer = new SequenceBuffer(30);
  }

  /**
   * Initialize the model and load labels
   * @returns Promise<void>
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      console.log("✅ Model already initialized");
      return;
    }

    try {
      console.log("📂 Loading LSTM model...");
      this.model = await tf.loadLayersModel(this.modelPath);
      console.log("✅ Model loaded successfully");
      console.log(`   Input: ${this.model.inputs[0].shape}`);
      console.log(`   Output: ${this.model.outputs[0].shape}`);

      console.log("📋 Loading labels...");
      const response = await fetch(this.labelsPath);
      if (!response.ok) {
        throw new Error(`Failed to load labels: ${response.status}`);
      }
      this.labels = await response.json();
      console.log(`✅ Ready! ${this.labels.length} signs loaded`);

      this.isInitialized = true;
    } catch (error: any) {
      console.error("❌ Initialization failed:", error);
      throw new Error(`Failed to initialize: ${error.message}`);
    }
  }

  /**
   * Predict sign from sequence buffer
   * @param sequenceBuffer - Buffer containing landmark frames (optional, uses internal buffer if not provided)
   * @param minConfidence - Minimum confidence threshold (0-100)
   * @returns Promise<PredictionResult|null> Prediction result or null
   */
  async predict(sequenceBuffer: SequenceBuffer | null = null, minConfidence: number = 30): Promise<PredictionResult | null> {
    if (!this.isInitialized) {
      throw new Error("Model not initialized. Call init() first.");
    }

    const buffer = sequenceBuffer || this.sequenceBuffer;
    let input: tf.Tensor3D | null = null;
    let predictions: tf.Tensor | null = null;

    try {
      const sequence = buffer.getSequence();
      if (!sequence) {
        return null;
      }

      // Create tensor [1, 30, 63]
      input = tf.tensor3d([sequence], [1, 30, 63]);

      // Run prediction
      predictions = this.model!.predict(input) as tf.Tensor;
      const predArray = await predictions.data();
      const probs = Array.from(predArray);

      // Get top prediction
      const maxIdx = probs.indexOf(Math.max(...probs));
      const confidence = probs[maxIdx] * 100;
      const label = this.labels[maxIdx] || "?";

      // Filter by confidence threshold
      if (confidence < minConfidence) {
        return null;
      }

      // Get top 3 predictions
      const topIndices = probs
        .map((prob, idx) => ({ prob, idx }))
        .sort((a, b) => b.prob - a.prob)
        .slice(0, 3);

      const top3 = topIndices.map((item) => ({
        label: this.labels[item.idx],
        confidence: (item.prob * 100).toFixed(1),
      }));

      return {
        label,
        confidence: confidence.toFixed(1),
        top3,
        allPredictions: probs.map(p => (p * 100).toFixed(2)),
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

  /**
   * Add a frame to the internal sequence buffer
   * @param landmarks - 63 landmark values
   */
  addFrame(landmarks: number[]): void {
    this.sequenceBuffer.addFrame(landmarks);
  }

  /**
   * Clear the sequence buffer
   */
  clear(): void {
    this.sequenceBuffer.clear();
  }

  /**
   * Get current buffer length
   * @returns number
   */
  getBufferLength(): number {
    return this.sequenceBuffer.getLength();
  }

  /**
   * Check if model is initialized
   * @returns boolean
   */
  getIsReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get loaded labels
   * @returns Array<string>
   */
  getLabels(): string[] {
    return [...this.labels];
  }

  /**
   * Check if buffer is full
   * @returns boolean
   */
  isBufferFull(): boolean {
    return this.sequenceBuffer.isFull();
  }
}

