/**
 * useVoiceCommand - Detects and processes voice commands
 * Commands: "1" (start), "2" (read), "3" (next), "4" (prev), "5" (repeat), "6" (submit)
 */

import { useState, useRef, useCallback } from 'react';
import { VoiceCommand } from '../../types/student/voice.types';

const VOICE_COMMAND_MAP: Record<string, VoiceCommand['action']> = {
  '1': 'start_answer',
  '2': 'read_again',
  '3': 'next',
  '4': 'previous',
  '5': 'repeat',
  '6': 'submit',
};

const COMMAND_KEYWORDS: Record<string, string[]> = {
  '1': ['one', 'start', 'answer', 'शुरु', 'सुरु'],
  '2': ['two', 'read', 'repeat', 'फिर से', 'पुन्हा'],
  '3': ['three', 'next', 'आगे', 'पुढे'],
  '4': ['four', 'previous', 'back', 'पिछला', 'मागे'],
  '5': ['five', 'repeat', 'again', 'दोबारा', 'पुन्हा'],
  '6': ['six', 'submit', 'finish', 'जमा', 'पूर्ण'],
};

interface UseVoiceCommandReturn {
  isListening: boolean;
  lastCommand: VoiceCommand | null;
  startListening: () => void;
  stopListening: () => void;
  onCommand: (callback: (command: VoiceCommand) => void) => void;
  confidence: number;
  error: string | null;
}

export function useVoiceCommand(): UseVoiceCommandReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const commandCallbackRef = useRef<(command: VoiceCommand) => void>(() => {});
  const recognitionRef = useRef<any>(null);

  const parseCommand = useCallback((transcript: string, conf: number): VoiceCommand | null => {
    const normalized = transcript.toLowerCase().trim();
    
    // Try direct number match
    if (VOICE_COMMAND_MAP[normalized]) {
      const command: VoiceCommand = {
        command: normalized,
        action: VOICE_COMMAND_MAP[normalized],
        confidence: conf,
        rawText: transcript,
        timestamp: new Date(),
      };
      return command;
    }

    // Try keyword matching
    for (const [num, keywords] of Object.entries(COMMAND_KEYWORDS)) {
      if (keywords.some(kw => normalized.includes(kw))) {
        const command: VoiceCommand = {
          command: num,
          action: VOICE_COMMAND_MAP[num],
          confidence: conf * 0.9, // Slightly lower confidence for keyword match
          rawText: transcript,
          timestamp: new Date(),
        };
        return command;
      }
    }

    return null;
  }, []);

  const startListening = useCallback(async () => {
    try {
      setError(null);

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        throw new Error('SpeechRecognition is not supported in this browser');
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const result = event.results?.[0]?.[0];
        const transcript = result?.transcript || '';
        const commandConfidence = result?.confidence ?? 0.8;

        const command = parseCommand(transcript, commandConfidence);
        if (command) {
          setLastCommand(command);
          setConfidence(command.confidence);
          commandCallbackRef.current(command);
        }
      };

      recognition.onerror = (event: any) => {
        setError(event.error || 'Voice recognition error');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch (err) {
      setError((err as Error).message);
      setIsListening(false);
    }
  }, [parseCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const onCommand = useCallback((callback: (command: VoiceCommand) => void) => {
    commandCallbackRef.current = callback;
  }, []);

  return {
    isListening,
    lastCommand,
    startListening,
    stopListening,
    onCommand,
    confidence,
    error,
  };
}
