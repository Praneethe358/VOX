import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as faceapi from 'face-api.js';
import { studentApi } from '../api/client';

export default function StudentLogin() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [examCode, setExamCode] = useState('');

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        setModelsLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading models:', err);
        setError('Failed to load face detection models. Using fallback mode.');
        setModelsLoaded(false);
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError('');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please allow camera permissions.');
    }
  };

  // Detect face and get descriptor
  const detectFace = async () => {
    if (!videoRef.current || !modelsLoaded) {
      setError('Models not loaded. Please wait...');
      return;
    }

    setDetecting(true);
    setError('');

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        // Draw detection on canvas
        if (canvasRef.current && videoRef.current) {
          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          };
          faceapi.matchDimensions(canvasRef.current, displaySize);
          const resizedDetection = faceapi.resizeResults(detection, displaySize);
          
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
            faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetection);
          }
        }

        // Get face descriptor (embedding)
        const descriptor = Array.from(detection.descriptor);
        
        // Call backend API to verify face
        await verifyWithBackend(descriptor);
      } else {
        setError('No face detected. Please position your face in the frame.');
        setDetecting(false);
      }
    } catch (err) {
      console.error('Detection error:', err);
      setError('Face detection failed. Please try again.');
      setDetecting(false);
    }
  };

  // Verify face with backend
  const verifyWithBackend = async (descriptor: number[]) => {
    try {
      if (!descriptor || descriptor.length === 0) {
        setError('Invalid face descriptor. Please try again.');
        setDetecting(false);
        return;
      }

      const result = await studentApi.verifyFace(examCode || 'TECH101', descriptor);

      if (result.success && result.data?.matched) {
        // Store student info in session
        sessionStorage.setItem('studentAuth', 'true');
        sessionStorage.setItem('studentId', result.data.studentId || 'UNKNOWN');
        sessionStorage.setItem('studentName', result.data.student?.name || 'Student');
        
        // Navigate to student dashboard
        setTimeout(() => navigate('/student/exams'), 1000);
      } else if (!result.success) {
        // API returned an error
        const errorMsg = result.error || 'Face verification failed. ';
        const detailedMsg = result.data?.confidence !== undefined 
          ? `${errorMsg}(Confidence: ${(result.data.confidence * 100).toFixed(1)}%)`
          : errorMsg;
        setError(detailedMsg);
        setDetecting(false);
      } else {
        // Face not matched
        setError('Face not recognized. Please ensure good lighting and look directly at the camera. Try again.');
        setDetecting(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Backend error: ${errorMsg}. Check console for details.`);
      setDetecting(false);
    }
  };


  return (
    <section className="screen flex-center" style={{ padding: '24px' }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          style={{ marginBottom: '24px', color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Home
        </motion.button>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ padding: '32px' }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', textAlign: 'center', letterSpacing: '-0.5px' }}>Student Login</h1>
          <p style={{ color: 'var(--text-sec)', textAlign: 'center', marginBottom: '32px', fontSize: '14px' }}>Verify your identity using face recognition</p>

          {/* Loading State */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div className="w-12 h-12 rounded-full border-2 border-accent/30 border-t-accent-lt animate-spin mx-auto"></div>
              <p style={{ color: 'var(--text-sec)', marginTop: '16px', fontSize: '14px' }}>Loading face detection models...</p>
            </div>
          )}

          {/* Camera Section */}
          {!isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Exam Code Input */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Exam Code (Optional)
                </label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  placeholder="e.g., TECH101"
                  style={{ width: '100%', padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
                />
              </div>

              {/* Video Preview */}
              <div style={{ position: 'relative', background: '#000', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
                {!cameraActive && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 13, 20, 0.8)', backdropFilter: 'blur(4px)' }}>
                    <button
                      onClick={startCamera}
                      disabled={!modelsLoaded}
                      className="ex-btn primary"
                      style={{ opacity: !modelsLoaded ? 0.5 : 1, cursor: !modelsLoaded ? 'not-allowed' : 'pointer' }}
                    >
                      <span style={{ marginRight: '8px' }}>📷</span> Start Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Face Detection Button */}
              {cameraActive && modelsLoaded && (
                <button
                  onClick={detectFace}
                  disabled={detecting}
                  className="ex-btn primary"
                  style={{ width: '100%', opacity: detecting ? 0.7 : 1 }}
                >
                  {detecting ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                      Verifying...
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🔍</span> Detect & Verify Face
                    </div>
                  )}
                </button>
              )}

              {/* Error Message */}
              {error && (
                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '13px', lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

            </div>
          )}
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-sec)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ opacity: 0.6 }}>📌</span> Position your face clearly in the camera frame
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ opacity: 0.6 }}>💡</span> Ensure good lighting for better detection
          </div>
        </motion.div>
      </div>
    </section>
  );
}
