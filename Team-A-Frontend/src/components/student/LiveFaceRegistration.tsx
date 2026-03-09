/**
 * LiveFaceRegistration — Admin component for registering student faces via webcam.
 *
 * Flow:
 *   1. Admin fills in student ID, name, exam code, email
 *   2. Clicks "Start Camera" → webcam activates
 *   3. System detects single face → shows green box
 *   4. Auto-captures N frames (5) of face embeddings
 *   5. Displays progress, averages embeddings, sends to backend
 *   6. Backend stores normalized 128D embedding in MongoDB
 *
 * Rejects: multiple faces, no face, low quality detections.
 * Uses face-api.js TinyFaceDetector + FaceLandmark68Net + FaceRecognitionNet.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import { loadFaceApiModels } from '../../utils/faceApiLoader';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  onRegistered?: (data: { studentId: string; studentName: string; embeddingSize: number; frameCount: number }) => void;
  onCancel?: () => void;
}

type CaptureStatus =
  | 'IDLE'
  | 'LOADING_MODELS'
  | 'CAMERA_STARTING'
  | 'DETECTING'
  | 'CAPTURING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR';

const REQUIRED_FRAMES = 5;
const DETECTION_INTERVAL_MS = 500;

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'http://localhost:3000/api';

// ─── Component ──────────────────────────────────────────────────────────────

export function LiveFaceRegistration({ onRegistered, onCancel }: Props) {
  // Form
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [examCode, setExamCode] = useState('TECH101');
  const [email, setEmail] = useState('');

  // Camera / Detection
  const [status, setStatus] = useState<CaptureStatus>('IDLE');
  const [faceCount, setFaceCount] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState(0);
  const [error, setError] = useState('');
  const [detectionBox, setDetectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const descriptorsRef = useRef<number[][]>([]);
  const modelsLoadedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const capturingRef = useRef(false);

  // Ref to hold latest form data — avoids stale closure in setInterval callback
  const formDataRef = useRef({ studentId: '', studentName: '', examCode: 'TECH101', email: '' });
  useEffect(() => {
    formDataRef.current = { studentId, studentName, examCode, email };
  }, [studentId, studentName, examCode, email]);

  // Ref to hold latest submitEmbeddings function for the interval to call
  const submitEmbeddingsRef = useRef<() => Promise<void>>(async () => {});

  // ─── Model Loading ────────────────────────────────────────────────────────

  const loadModels = useCallback(async () => {
    if (modelsLoadedRef.current) return;
    setStatus('LOADING_MODELS');
    try {
      console.log('[Face Registration] Loading models via centralized loader');
      await loadFaceApiModels();
      modelsLoadedRef.current = true;
      console.log('[Face Registration] Models loaded successfully');
    } catch (err) {
      console.error('[Face Registration] Failed to load models:', err);
      throw new Error(`Failed to load face detection models: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  // ─── Camera ───────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      setError('');
      
      // Load models with timeout
      const loadTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Model loading timed out after 30 seconds')), 30000)
      );
      
      try {
        await Promise.race([loadModels(), loadTimeout]);
      } catch (modelErr) {
        console.error('[Face Registration] Model loading error:', modelErr);
        throw new Error(`Failed to load face detection models. ${modelErr instanceof Error ? modelErr.message : 'Check console for details.'}`);
      }
      
      setStatus('CAMERA_STARTING');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
        }
      });

      setStatus('DETECTING');
      descriptorsRef.current = [];
      setCapturedFrames(0);
      capturingRef.current = false;
      startDetectionLoop();
    } catch (err: any) {
      console.error('[Face Registration] Start camera error:', err);
      setError(err.message || 'Camera access denied');
      setStatus('ERROR');
    }
  }, [loadModels]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    capturingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ─── Detection Loop ───────────────────────────────────────────────────────

  const startDetectionLoop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (capturingRef.current) return; // avoid overlapping detections

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        setFaceCount(detections.length);

        if (detections.length === 0) {
          setDetectionBox(null);
          return;
        }

        if (detections.length > 1) {
          setDetectionBox(null);
          setError('Multiple faces detected — only one face allowed');
          return;
        }

        setError('');
        const det = detections[0];
        const box = det.detection.box;

        // Scale box to video display size
        const videoEl = videoRef.current;
        const displayW = videoEl.clientWidth;
        const displayH = videoEl.clientHeight;
        const scaleX = displayW / videoEl.videoWidth;
        const scaleY = displayH / videoEl.videoHeight;

        setDetectionBox({
          x: box.x * scaleX,
          y: box.y * scaleY,
          w: box.width * scaleX,
          h: box.height * scaleY,
        });

        // Quality check: detection score must be reasonable
        if (det.detection.score < 0.6) return;

        // Capture this frame's descriptor
        if (descriptorsRef.current.length < REQUIRED_FRAMES) {
          capturingRef.current = true;
          descriptorsRef.current.push(Array.from(det.descriptor));
          setCapturedFrames(descriptorsRef.current.length);
          capturingRef.current = false;

          if (descriptorsRef.current.length >= REQUIRED_FRAMES) {
            // All frames captured — submit via ref to get latest closure
            if (intervalRef.current) clearInterval(intervalRef.current);
            await submitEmbeddingsRef.current();
          }
        }
      } catch {
        // Ignore transient detection errors
      }
    }, DETECTION_INTERVAL_MS);
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const submitEmbeddings = useCallback(async () => {
    setStatus('PROCESSING');
    // Read from ref to get latest form data (avoids stale closure)
    const fd = formDataRef.current;
    try {
      const response = await fetch(`${API_BASE}/face/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: fd.studentId.trim(),
          studentName: fd.studentName.trim(),
          examCode: fd.examCode.trim() || 'TECH101',
          email: fd.email.trim(),
          descriptors: descriptorsRef.current,
          qualityScore: 0.9,
        }),
      });
      const result = await response.json();

      if (result.success) {
        setStatus('SUCCESS');
        stopCamera();
        onRegistered?.({
          studentId: fd.studentId.trim(),
          studentName: fd.studentName.trim(),
          embeddingSize: result.data?.embeddingSize ?? 128,
          frameCount: result.data?.frameCount ?? REQUIRED_FRAMES,
        });
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setStatus('ERROR');
      stopCamera();
    }
  }, [stopCamera, onRegistered]);

  // Keep the ref pointing to the latest submitEmbeddings
  useEffect(() => {
    submitEmbeddingsRef.current = submitEmbeddings;
  }, [submitEmbeddings]);

  const handleStartCapture = () => {
    if (!studentId.trim() || !studentName.trim()) {
      setError('Student ID and Name are required');
      return;
    }
    startCamera();
  };

  const handleReset = () => {
    stopCamera();
    setStatus('IDLE');
    setError('');
    setCapturedFrames(0);
    setFaceCount(0);
    setDetectionBox(null);
    descriptorsRef.current = [];
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────

  const statusMessages: Record<CaptureStatus, string> = {
    IDLE: 'Fill in student details and start camera',
    LOADING_MODELS: 'Loading face detection models...',
    CAMERA_STARTING: 'Starting camera...',
    DETECTING: faceCount === 0 ? 'Looking for face...' : faceCount > 1 ? '⚠ Multiple faces detected!' : `Capturing frames... (${capturedFrames}/${REQUIRED_FRAMES})`,
    CAPTURING: `Capturing frames... (${capturedFrames}/${REQUIRED_FRAMES})`,
    PROCESSING: 'Processing embeddings...',
    SUCCESS: '✅ Face registered successfully!',
    ERROR: error || 'An error occurred',
  };

  const isCapturing = status === 'DETECTING' || status === 'CAPTURING';
  const isActive = status !== 'IDLE' && status !== 'SUCCESS' && status !== 'ERROR';

  return (
    <div className="space-y-6">
      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Student ID <span className="text-red-400">*</span></label>
          <input
            type="text"
            placeholder="e.g., STU001"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            disabled={isActive}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            placeholder="e.g., John Doe"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            disabled={isActive}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Exam Code</label>
          <input
            type="text"
            placeholder="TECH101"
            value={examCode}
            onChange={e => setExamCode(e.target.value.toUpperCase())}
            disabled={isActive}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none font-mono disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input
            type="email"
            placeholder="student@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isActive}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Camera Feed */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} width={640} height={480} className="hidden" />

        {/* Face detection box */}
        {isCapturing && detectionBox && (
          <motion.div
            className={`absolute border-2 rounded-lg pointer-events-none ${
              faceCount === 1 ? 'border-green-400' : 'border-red-400'
            }`}
            style={{
              left: detectionBox.x,
              top: detectionBox.y,
              width: detectionBox.w,
              height: detectionBox.h,
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* No camera overlay */}
        {status === 'IDLE' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
            <div className="text-center">
              <span className="text-5xl">📷</span>
              <p className="text-slate-400 mt-3 text-sm">Camera not active</p>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {status === 'PROCESSING' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <motion.div
              className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}

        {/* Success overlay */}
        {status === 'SUCCESS' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-green-900/60"
          >
            <span className="text-6xl">✅</span>
          </motion.div>
        )}
      </div>

      {/* Progress Bar */}
      {isCapturing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Capturing face data</span>
            <span className="text-indigo-400 font-mono">{capturedFrames}/{REQUIRED_FRAMES}</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"
              animate={{ width: `${(capturedFrames / REQUIRED_FRAMES) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status + error}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`p-3 rounded-lg text-center text-sm font-medium ${
            status === 'SUCCESS'
              ? 'bg-green-500/10 border border-green-500/30 text-green-300'
              : status === 'ERROR'
              ? 'bg-red-500/10 border border-red-500/30 text-red-300'
              : faceCount > 1
              ? 'bg-orange-500/10 border border-orange-500/30 text-orange-300'
              : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
          }`}
        >
          {statusMessages[status]}
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {status === 'IDLE' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStartCapture}
            disabled={!studentId.trim() || !studentName.trim()}
            className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-semibold hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            📷 Start Camera & Capture Face
          </motion.button>
        )}

        {(status === 'SUCCESS' || status === 'ERROR') && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-all"
          >
            🔄 Register Another Student
          </motion.button>
        )}

        {isActive && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { stopCamera(); setStatus('IDLE'); }}
            className="px-4 py-3 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-all"
          >
            Stop Camera
          </motion.button>
        )}

        {onCancel && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { stopCamera(); onCancel(); }}
            className="px-4 py-3 rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-all"
          >
            Cancel
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default LiveFaceRegistration;
