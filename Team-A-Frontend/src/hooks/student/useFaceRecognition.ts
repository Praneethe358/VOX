/**
 * useFaceRecognition - Handles face recognition for student login
 */

import { useState, useRef, useCallback } from 'react';
import type { FaceMatchResult } from '../../types/student/student.types';
import apiService from '../../services/student/api.service';
import * as faceapi from 'face-api.js';

interface UseFaceRecognitionReturn {
  isInitialized: boolean;
  isScanning: boolean;
  isProcessing: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  matchResult: FaceMatchResult | null;
  error: string | null;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  captureAndMatchFace: (examCode?: string) => Promise<FaceMatchResult | null>;
}

export function useFaceRecognition(): UseFaceRecognitionReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState<FaceMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelsLoadedRef = useRef(false);

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
  }, []);

  const captureAndMatchFace = useCallback(async (examCode: string = 'TECH101'): Promise<FaceMatchResult | null> => {
    try {
      setError(null);
      setIsProcessing(true);

      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas reference not available');
      }

      await ensureModelsLoaded();

      // Capture frame from video
      const context = canvasRef.current.getContext('2d');
      if (!context) throw new Error('Canvas context not available');

      context.drawImage(
        videoRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      const imageData = canvasRef.current.toDataURL('image/jpeg');

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      const detection = detections
        .slice()
        .sort((a, b) => (b.detection.box.width * b.detection.box.height) - (a.detection.box.width * a.detection.box.height))[0];

      if (!detection) {
        throw new Error('No face detected. Please position your face within the frame.');
      }

      const liveDescriptor = Array.from(detection.descriptor);

      const response = await apiService.verifyStudentFace(examCode, liveDescriptor);
      const matchedStudent = response.data?.student;
      const matched = Boolean(response.data?.matched);
      const result: FaceMatchResult = {
        matched,
        studentId: response.data?.studentId || matchedStudent?.studentId || matchedStudent?._id || 'unknown',
        confidence: response.data?.confidence ?? (matched ? 1 : 0),
        matchedStudent,
        timestamp: new Date(),
      };

      if (result.confidence > 0.95) {
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
  }, [ensureModelsLoaded]);

  return {
    isInitialized,
    isScanning,
    isProcessing,
    videoRef,
    canvasRef,
    matchResult,
    error,
    startScanning,
    stopScanning,
    captureAndMatchFace,
  };
}
