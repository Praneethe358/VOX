/**
 * Voice processing types
 */

export interface VoiceCommand {
  command: string; // "1", "2", "3", "4", "5", "6"
  action: 'start_answer' | 'read_again' | 'next' | 'previous' | 'repeat' | 'submit';
  confidence: number; // 0-1
  rawText: string;
  timestamp: Date;
}

export interface VoiceConfig {
  language: string; // "en", "hi", "mr"
  speechRate: number; // 0.5-2.0
  volume: number; // 0-1
  engine: 'vosk' | 'whisper'; // STT engine
  ttsEngine: 'espeak'; // TTS engine
}

export interface SpeechToTextResult {
  text: string;
  confidence: number; // 0-1
  isFinal: boolean;
  language?: string;
  duration?: number; // milliseconds
}

export interface TextToSpeechRequest {
  text: string;
  language?: string;
  rate?: number; // 0.5-2.0
  volume?: number; // 0-1
}

export interface TextToSpeechResult {
  audioUrl: string;
  duration: number; // seconds
}

export interface VoskCommandMap {
  '1': 'start_answer';
  '2': 'read_again';
  '3': 'next';
  '4': 'previous';
  '5': 'repeat';
  '6': 'submit';
}

export interface AudioBuffer {
  data: Float32Array;
  sampleRate: number;
  duration: number; // seconds
}

export interface MicrophoneStatus {
  active: boolean;
  volume: number; // 0-100
  isListening: boolean;
  audioLevel: number; // dB
}
