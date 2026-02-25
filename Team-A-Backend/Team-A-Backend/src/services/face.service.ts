import { Db } from "mongodb";

export interface FaceVerifyResult {
  success: boolean;
  studentId?: string;
}

export class FaceService {
  private db: Db | null = null;

  setDb(db: Db): void {
    this.db = db;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
  }

  async verifyFace(examCode: string, liveDescriptor: number[]): Promise<FaceVerifyResult> {
    try {
      if (!this.db) return { success: false };

      const students = await this.db
        .collection("students")
        .find({ examCode })
        .toArray();

      const THRESHOLD = 0.6;

      for (const student of students) {
        const stored: number[] = student["faceDescriptor"];
        if (!stored || stored.length !== liveDescriptor.length) continue;
        const distance = this.euclideanDistance(stored, liveDescriptor);
        if (distance < THRESHOLD) {
          return { success: true, studentId: student["studentId"] as string };
        }
      }

      return { success: false };
    } catch (error) {
      console.error("Face verify error:", error);
      return { success: false };
    }
  }
}

export const faceService = new FaceService();
