/**
 * FaceService — handles face embedding normalization, comparison, registration & verification.
 *
 * Supports two comparison methods:
 *   1. Cosine Similarity  (preferred, threshold ≥ 0.6 = match)
 *   2. Euclidean Distance  (fallback, threshold < 0.6 = match)
 *
 * Embeddings are always L2-normalized before storage and comparison.
 */

import { Db } from "mongodb";
import type {
  FaceEmbeddingDocument,
  FaceRegisterRequest,
  FaceRegisterResponse,
  FaceVerifyResponse,
  FaceLoginAttempt,
} from "../database/models/FaceEmbedding";

// ─── Thresholds ─────────────────────────────────────────────────────────────
const COSINE_MATCH_THRESHOLD = 0.85;     // similarity ≥ 0.85 → match (face-api.js 128D)
const EUCLIDEAN_MATCH_THRESHOLD = 0.55;   // distance < 0.55 → match
const MAX_LOGIN_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export interface FaceVerifyResult {
  success: boolean;
  studentId?: string;
  studentName?: string;
  confidence?: number;
  distance?: number;
  student?: any;
}

export class FaceService {
  private db: Db | null = null;

  setDb(db: Db): void {
    this.db = db;
  }

  // ─── Vector Math ──────────────────────────────────────────────────────────

  /** L2-normalize a vector (unit vector) */
  normalize(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vec;
    return vec.map(v => v / magnitude);
  }

  /** Cosine similarity between two vectors (both should be normalized) → range [-1, 1] */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  /** Euclidean distance between two vectors */
  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }

  /** Average multiple 128D descriptors into one embedding */
  averageDescriptors(descriptors: number[][]): number[] {
    if (descriptors.length === 0) return [];
    const dim = descriptors[0].length;
    const avg = new Array(dim).fill(0);
    for (const desc of descriptors) {
      for (let i = 0; i < dim; i++) avg[i] += desc[i];
    }
    for (let i = 0; i < dim; i++) avg[i] /= descriptors.length;
    return avg;
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  async registerFaceEmbedding(req: FaceRegisterRequest): Promise<FaceRegisterResponse> {
    const { studentId, studentName, examCode, email, descriptors, qualityScore } = req;

    if (!descriptors || descriptors.length === 0) {
      throw new Error("No face descriptors provided");
    }

    // Average all captured frames into a single embedding
    const averaged = this.averageDescriptors(descriptors);
    const normalized = this.normalize(averaged);

    const now = new Date().toISOString();
    const doc: FaceEmbeddingDocument = {
      studentId,
      studentName,
      examCode,
      email,
      facialEmbedding: averaged,
      normalizedEmbedding: normalized,
      frameCount: descriptors.length,
      qualityScore: qualityScore ?? 0.9,
      createdAt: now,
      updatedAt: now,
    };

    if (this.db) {
      // Upsert — replace if student already registered
      await this.db.collection("face_embeddings").updateOne(
        { studentId },
        { $set: doc },
        { upsert: true },
      );
      // Also update legacy students collection for backward compat
      await this.db.collection("students").updateOne(
        { $or: [{ studentId }, { registerNumber: studentId }, { email: email || `${studentId}@mindkraft.local` }] },
        {
          $set: {
            studentId,
            registerNumber: studentId,
            name: studentName,
            fullName: studentName,
            examCode,
            email: email || `${studentId}@mindkraft.local`,
            faceDescriptor: averaged,
            registeredAt: now,
          },
        },
        { upsert: true },
      );
    }

    return {
      registered: true,
      studentId,
      embeddingSize: normalized.length,
      frameCount: descriptors.length,
    };
  }

  // ─── Verification ─────────────────────────────────────────────────────────

  async verifyFace(examCode: string, liveDescriptor: number[]): Promise<FaceVerifyResult> {
    try {
      if (!this.db) return { success: false };

      const normalizedLive = this.normalize(liveDescriptor);
      const normalizedExamCode = (examCode || "").trim();

      // Search in face_embeddings collection first, fallback to students
      let candidates = await this.db
        .collection("face_embeddings")
        .find(
          normalizedExamCode
            ? { examCode: { $regex: `^${normalizedExamCode}$`, $options: "i" } }
            : {},
        )
        .toArray();

      if (candidates.length === 0) {
        candidates = await this.db
          .collection("students")
          .find(
            normalizedExamCode
              ? { examCode: { $regex: `^${normalizedExamCode}$`, $options: "i" } }
              : {},
          )
          .toArray();
      }

      let bestMatch: FaceVerifyResult = { success: false };
      let bestSimilarity = -1;

      for (const candidate of candidates) {
        const stored: number[] =
          candidate["normalizedEmbedding"] || candidate["facialEmbedding"] || candidate["faceDescriptor"];
        if (!stored || stored.length !== normalizedLive.length) continue;

        const normalizedStored = candidate["normalizedEmbedding"]
          ? stored
          : this.normalize(stored);

        const similarity = this.cosineSimilarity(normalizedLive, normalizedStored);
        const distance = this.euclideanDistance(normalizedLive, normalizedStored);

        if (similarity >= COSINE_MATCH_THRESHOLD && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            success: true,
            studentId: (candidate["studentId"] as string) || "",
            studentName: (candidate["studentName"] || candidate["name"]) as string,
            confidence: similarity,
            distance,
            student: candidate,
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error("Face verify error:", error);
      return { success: false };
    }
  }

  /** Verify by specific studentId (for login flow) */
  async verifyFaceByStudentId(
    studentId: string,
    liveDescriptor: number[],
  ): Promise<FaceVerifyResponse> {
    const normalizedLive = this.normalize(liveDescriptor);

    if (this.db) {
      // Check rate limiting
      const isLimited = await this.isRateLimited(studentId);
      if (isLimited) {
        return {
          matched: false,
          confidence: 0,
          distance: Infinity,
          method: "cosine",
          studentId,
        };
      }

      // Find stored embedding
      let doc = await this.db.collection("face_embeddings").findOne({ studentId });
      if (!doc) {
        doc = await this.db.collection("students").findOne({ studentId });
      }

      if (!doc) {
        await this.logAttempt({ studentId, matched: false, confidence: 0, timestamp: new Date().toISOString(), reason: "Student not found" });
        return { matched: false, confidence: 0, distance: Infinity, method: "cosine", studentId };
      }

      const stored: number[] = doc["normalizedEmbedding"] || doc["facialEmbedding"] || doc["faceDescriptor"];
      if (!stored || stored.length !== normalizedLive.length) {
        await this.logAttempt({ studentId, matched: false, confidence: 0, timestamp: new Date().toISOString(), reason: "No embedding stored" });
        return { matched: false, confidence: 0, distance: Infinity, method: "cosine", studentId };
      }

      const normalizedStored = doc["normalizedEmbedding"] ? stored : this.normalize(stored);
      const similarity = this.cosineSimilarity(normalizedLive, normalizedStored);
      const distance = this.euclideanDistance(normalizedLive, normalizedStored);
      const matched = similarity >= COSINE_MATCH_THRESHOLD;

      await this.logAttempt({
        studentId,
        matched,
        confidence: similarity,
        timestamp: new Date().toISOString(),
        reason: matched ? "Match" : `Similarity ${similarity.toFixed(3)} below threshold ${COSINE_MATCH_THRESHOLD}`,
      });

      return {
        matched,
        studentId: doc["studentId"] as string,
        studentName: (doc["studentName"] || doc["name"]) as string,
        confidence: similarity,
        distance,
        method: "cosine",
        student: doc,
      };
    }

    return { matched: false, confidence: 0, distance: Infinity, method: "cosine" };
  }

  // ─── Rate Limiting ────────────────────────────────────────────────────────

  private async isRateLimited(studentId: string): Promise<boolean> {
    if (!this.db) return false;
    const cutoff = new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString();
    const recentFails = await this.db
      .collection("face_login_attempts")
      .countDocuments({ studentId, matched: false, timestamp: { $gte: cutoff } });
    return recentFails >= MAX_LOGIN_ATTEMPTS;
  }

  private async logAttempt(attempt: FaceLoginAttempt): Promise<void> {
    if (!this.db) return;
    try {
      await this.db.collection("face_login_attempts").insertOne(attempt);
    } catch {
      // non-critical
    }
  }

  // ─── Query ────────────────────────────────────────────────────────────────

  async getRegisteredStudents(): Promise<FaceEmbeddingDocument[]> {
    if (!this.db) return [];
    const docs = await this.db
      .collection("face_embeddings")
      .find({})
      .project({ normalizedEmbedding: 0, facialEmbedding: 0 })
      .toArray();

    return docs.map((doc: any) => ({
      ...doc,
      hasEmbedding: true,
    })) as unknown as FaceEmbeddingDocument[];
  }

  async getFaceEmbedding(studentId: string): Promise<FaceEmbeddingDocument | null> {
    if (!this.db) return null;
    return (await this.db
      .collection("face_embeddings")
      .findOne({ studentId })) as unknown as FaceEmbeddingDocument | null;
  }

  async deleteFaceEmbedding(studentId: string): Promise<boolean> {
    if (!this.db) return false;
    const result = await this.db.collection("face_embeddings").deleteOne({ studentId });
    return (result.deletedCount ?? 0) > 0;
  }

  async getLoginAttempts(studentId: string, limit: number = 20): Promise<FaceLoginAttempt[]> {
    if (!this.db) return [];
    return (await this.db
      .collection("face_login_attempts")
      .find({ studentId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()) as unknown as FaceLoginAttempt[];
  }
}

export const faceService = new FaceService();
