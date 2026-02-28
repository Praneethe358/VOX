/**
 * FaceEmbedding Model — stores normalized facial feature vectors for each student.
 * Used for face registration (admin) and face verification (student login).
 */

export interface FaceEmbeddingDocument {
  studentId: string;
  studentName: string;
  examCode?: string;
  email?: string;
  /** 128-dimensional face descriptor (Float64Array from face-api.js) */
  facialEmbedding: number[];
  /** L2-normalized embedding for cosine similarity */
  normalizedEmbedding: number[];
  /** Number of frames averaged to produce this embedding */
  frameCount: number;
  /** Quality score 0-1 from face detection confidence */
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaceVerifyRequest {
  studentId?: string;
  examCode?: string;
  liveDescriptor: number[];
}

export interface FaceVerifyResponse {
  matched: boolean;
  studentId?: string;
  studentName?: string;
  confidence: number;
  distance: number;
  method: 'cosine' | 'euclidean';
  student?: any;
}

export interface FaceRegisterRequest {
  studentId: string;
  studentName: string;
  examCode?: string;
  email?: string;
  /** Array of 128D descriptors from multiple captured frames */
  descriptors: number[][];
  qualityScore?: number;
}

export interface FaceRegisterResponse {
  registered: boolean;
  studentId: string;
  embeddingSize: number;
  frameCount: number;
}

export interface FaceLoginAttempt {
  studentId?: string;
  examCode?: string;
  ipAddress?: string;
  matched: boolean;
  confidence: number;
  timestamp: string;
  reason?: string;
}
