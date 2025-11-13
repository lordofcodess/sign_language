// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  TEXT_TO_SIGN: `${API_BASE_URL}/api/text-to-sign`,
  TEXT_TO_SPEECH_AKAN: `${API_BASE_URL}/api/text-to-speech/akan`,
  TEXT_TO_SPEECH_EWE: `${API_BASE_URL}/api/text-to-speech/ewe`,
} as const;

export type TTSLanguage = 'en' | 'ak' | 'ee';
export type TTSModelType = 'ms' | string; // 'ms' for Microsoft, can be extended
export type TTSSpeaker = 'PT' | string; // Speaker ID, can be extended
export type TTSModel = 'best_model.pth' | string; // Ewe model file

// Akan TTS payload
export interface AkanTTSPayload {
  text: string;
  model_type: TTSModelType;
  speaker: TTSSpeaker;
}

// Ewe TTS payload
export interface EweTTSPayload {
  text: string;
  model: TTSModel;
}

export interface TTSResponse {
  text: string;
  audio_url: string;
  success: boolean;
  message: string;
}

