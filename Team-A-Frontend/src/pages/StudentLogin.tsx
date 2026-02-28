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
      const result = await studentApi.verifyFace(examCode || 'TECH101', descriptor);

      if (result.success && result.data?.matched) {
        // Store student info in session
        sessionStorage.setItem('studentAuth', 'true');
        sessionStorage.setItem('studentId', result.data.studentId || 'UNKNOWN');
        sessionStorage.setItem('studentName', result.data.student?.name || 'Student');
        
        // Navigate to student dashboard
        setTimeout(() => navigate('/student/dashboard'), 1000);
      } else {
        setError(result.error || 'Face verification failed. Please try again.');
        setDetecting(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Connection error. Please check if the backend is running.');
      setDetecting(false);
    }
  };

  // Fallback: Manual login (for testing without face recognition)
  const handleManualLogin = () => {
    if (!studentName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    sessionStorage.setItem('studentAuth', 'true');
    sessionStorage.setItem('studentName', studentName);
    sessionStorage.setItem('studentId', 'DEMO_STUDENT_001');
    navigate('/student/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/')}
          className="mb-6 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
        >
          ← Back to Home
        </motion.button>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Student Login</h1>
          <p className="text-slate-400 text-center mb-8">Verify your identity using face recognition</p>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
              <p className="text-slate-400 mt-4">Loading face detection models...</p>
            </div>
          )}

          {/* Camera Section */}
          {!isLoading && (
            <div className="space-y-6">
              {/* Exam Code Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Exam Code (Optional)
                </label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  placeholder="e.g., TECH101"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full"
                  style={{ maxHeight: '360px' }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                    <button
                      onClick={startCamera}
                      disabled={!modelsLoaded}
                      className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-50"
                    >
                      📷 Start Camera
                    </button>
                  </div>
                )}
              </div>

              {/* Face Detection Button */}
              {cameraActive && modelsLoaded && (
                <button
                  onClick={detectFace}
                  disabled={detecting}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {detecting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Verifying...
                    </>
                  ) : (
                    <>🔍 Detect & Verify Face</>
                  )}
                </button>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Fallback Manual Login */}
              <div className="pt-6 border-t border-slate-700/50">
                <p className="text-slate-400 text-sm mb-3">Or login manually (for testing):</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
                  />
                  <button
                    onClick={handleManualLogin}
                    className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all"
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-slate-500 text-sm space-y-2"
        >
          <p>📌 Position your face clearly in the camera frame</p>
          <p>💡 Ensure good lighting for better detection</p>
        </motion.div>
      </div>
    </div>
  );
}
