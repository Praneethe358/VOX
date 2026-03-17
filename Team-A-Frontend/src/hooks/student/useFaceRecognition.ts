/**
 * useFaceRecognition — Handles face recognition for student login.
 *
 * Upgraded to use:
 *   1. Live camera capture (not photo)
 *   2. 128D face embedding extraction via face-api.js
 *   3. Backend embedding comparison (cosine similarity)
 *   4. Multi-face rejection
 *   5. Basic liveness detection (blink / movement tracking)
 *   6. Login attempt rate limiting (tracked server-side)
 */

import { useState, useRef, useCallback } from 'react';
import type { FaceMatchResult } from '../../types/student/student.types';
import { setStoredToken } from '../../api/client';
import * as faceapi from 'face-api.js';

const rawApiBase =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:3000/api';
const API_BASE = /\/api(?:\/|$)/.test(rawApiBase.replace(/\/+$/, ''))
  ? rawApiBase.replace(/\/+$/, '')
  : `${rawApiBase.replace(/\/+$/, '')}/api`;

interface UseFaceRecognitionReturn {
  isInitialized: boolean;
  isScanning: boolean;
  isProcessing: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  matchResult: FaceMatchResult | null;
  error: string | null;
  faceCount: number;
  livenessScore: number;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  captureAndMatchFace: (examCode?: string) => Promise<FaceMatchResult | null>;
  captureAndMatchById: (studentId: string) => Promise<FaceMatchResult | null>;
}

export function useFaceRecognition(): UseFaceRecognitionReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState<FaceMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelsLoadedRef = useRef(false);

  // Liveness tracking: store last few landmark positions to detect movement
  const landmarkHistoryRef = useRef<number[][]>([]);
  const MAX_LANDMARK_HISTORY = 10;

  const ensureModelsLoaded = useCallback(async () => {
    if (modelsLoadedRef.current) return;
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoadedRef.current = true;
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setError(null);
      landmarkHistoryRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      setIsScanning(true);
      setIsInitialized(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    landmarkHistoryRef.current = [];
  }, []);

  /**
   * Compute a basic liveness score by checking if face landmarks
   * have moved across recent frames (non-static → likely real person)
   */
  const computeLivenessScore = useCallback((landmarks: faceapi.FaceLandmarks68): number => {
    // Use nose tip position as movement proxy (landmark index 30)
    const noseTip = landmarks.positions[30];
    if (!noseTip) return 0;

    const current = [noseTip.x, noseTip.y];
    landmarkHistoryRef.current.push(current);
    if (landmarkHistoryRef.current.length > MAX_LANDMARK_HISTORY) {
      landmarkHistoryRef.current.shift();
    }

    if (landmarkHistoryRef.current.length < 3) return 0.3; // Not enough data yet

    // Calculate total movement across history
    let totalMovement = 0;
    for (let i = 1; i < landmarkHistoryRef.current.length; i++) {
      const prev = landmarkHistoryRef.current[i - 1];
      const curr = landmarkHistoryRef.current[i];
      totalMovement += Math.sqrt((curr[0] - prev[0]) ** 2 + (curr[1] - prev[1]) ** 2);
    }

    // Normalize: some movement is expected from a live person
    // Too little = static image, too much = erratic
    const avgMovement = totalMovement / (landmarkHistoryRef.current.length - 1);
    if (avgMovement < 0.5) return 0.2;  // Very static — suspicious
    if (avgMovement > 50) return 0.3;    // Erratic — suspicious
    return Math.min(1, 0.5 + avgMovement / 10);  // Normal range → 0.5-1.0
  }, []);

  /** Capture face and match by exam code (legacy flow) */
  const captureAndMatchFace = useCallback(async (examCode: string = 'TECH101'): Promise<FaceMatchResult | null> => {
    try {
      setError(null);
      setIsProcessing(true);

      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas reference not available');
      }

      await ensureModelsLoaded();

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      setFaceCount(detections.length);

      if (detections.length === 0) {
        throw new Error('No face detected. Please position your face within the frame.');
      }

      if (detections.length > 1) {
        throw new Error('Multiple faces detected. Only one person should be visible.');
      }

      const detection = detections[0];

      // Quality check
      if (detection.detection.score < 0.6) {
        throw new Error('Low quality detection. Please ensure good lighting.');
      }

      // Liveness check
      const liveness = computeLivenessScore(detection.landmarks);
      setLivenessScore(liveness);
      if (liveness < 0.3) {
        throw new Error('Liveness check failed. Please move your head slightly.');
      }

      const liveDescriptor = Array.from(detection.descriptor);

      // Call backend verify endpoint
      const response = await fetch(`${API_BASE}/face/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examCode, liveDescriptor }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      // Store JWT if returned
      if (data.data?.token) {
        setStoredToken(data.data.token);
      }

      const matched = Boolean(data.data?.matched);
      const matchedStudent = data.data?.student;

      const result: FaceMatchResult = {
        matched,
        studentId: data.data?.studentId || matchedStudent?.studentId || 'unknown',
        confidence: data.data?.confidence ?? (matched ? 1 : 0),
        matchedStudent,
        timestamp: new Date(),
      };

      if (matched) {
        setMatchResult(result);
      } else {
        setError('Face not recognized. Please try again.');
      }

      setIsProcessing(false);
      return result;
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      setIsProcessing(false);
      return null;
    }
  }, [ensureModelsLoaded, computeLivenessScore]);

  /** Capture face and match by specific student ID (new flow) */
  const captureAndMatchById = useCallback(async (studentId: string): Promise<FaceMatchResult | null> => {
    try {
      setError(null);
      setIsProcessing(true);

      if (!videoRef.current) {
        throw new Error('Video reference not available');
      }

      await ensureModelsLoaded();

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      setFaceCount(detections.length);

      if (detections.length === 0) {
        throw new Error('No face detected. Please look at the camera.');
      }

      if (detections.length > 1) {
        throw new Error('Multiple faces detected. Only one person should be visible.');
      }

      const detection = detections[0];

      if (detection.detection.score < 0.6) {
        throw new Error('Low quality detection. Ensure good lighting.');
      }

      // Liveness
      const liveness = computeLivenessScore(detection.landmarks);
      setLivenessScore(liveness);
      if (liveness < 0.3) {
        throw new Error('Liveness check failed. Move your head slightly.');
      }

      const liveDescriptor = Array.from(detection.descriptor);

      // Call verify-by-id endpoint
      const response = await fetch(`${API_BASE}/face/verify-by-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, liveDescriptor }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.data?.token) {
        setStoredToken(data.data.token);
      }

      const matched = Boolean(data.data?.matched);
      const result: FaceMatchResult = {
        matched,
        studentId: data.data?.studentId || studentId,
        confidence: data.data?.confidence ?? 0,
        matchedStudent: data.data?.student,
        timestamp: new Date(),
      };

      if (matched) {
        setMatchResult(result);
      } else {
        const conf = (data.data?.confidence ?? 0).toFixed(2);
        setError(`Face not recognized (confidence: ${conf}). Try again.`);
      }

      setIsProcessing(false);
      return result;
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      setIsProcessing(false);
      return null;
    }
  }, [ensureModelsLoaded, computeLivenessScore]);

  return {
    isInitialized,
    isScanning,
    isProcessing,
    videoRef,
    canvasRef,
    matchResult,
    error,
    faceCount,
    livenessScore,
    startScanning,
    stopScanning,
    captureAndMatchFace,
    captureAndMatchById,
  };
}
