/**
 * Global face-api.js model loader
 * Loads models once and caches the result to avoid repeated loading
 */

import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceApiModels(): Promise<void> {
  // Return immediately if already loaded
  if (modelsLoaded) {
    console.log('[FaceAPI] Models already loaded');
    return;
  }

  // Wait for existing load operation if in progress
  if (loadingPromise) {
    console.log('[FaceAPI] Waiting for existing load operation');
    return loadingPromise;
  }

  // Start loading
  console.log('[FaceAPI] Starting model load...');
  const MODEL_URL = '/models';

  loadingPromise = (async () => {
    try {
      const startTime = performance.now();

      // Load each model individually with logging
      console.log('[FaceAPI] Loading tinyFaceDetector...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log('[FaceAPI] ✓ tinyFaceDetector loaded');

      console.log('[FaceAPI] Loading faceLandmark68Net...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log('[FaceAPI] ✓ faceLandmark68Net loaded');

      console.log('[FaceAPI] Loading faceRecognitionNet...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log('[FaceAPI] ✓ faceRecognitionNet loaded');

      const duration = (performance.now() - startTime).toFixed(0);
      console.log(`[FaceAPI] All models loaded successfully in ${duration}ms`);

      modelsLoaded = true;
    } catch (error) {
      console.error('[FaceAPI] Failed to load models:', error);
      loadingPromise = null; // Reset so it can be retried
      throw new Error(
        `Failed to load face detection models: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Check that model files exist in public/models/ directory.`
      );
    }
  })();

  return loadingPromise;
}

export function areFaceApiModelsLoaded(): boolean {
  return modelsLoaded;
}
