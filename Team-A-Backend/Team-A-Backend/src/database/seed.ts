import bcrypt from "bcrypt";
import { getDb } from "./mongo-client";

export async function seedDatabase(): Promise<void> {
  const db = getDb();

  const adminCount = await db.collection("admins").countDocuments();
  if (adminCount === 0) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.collection("admins").insertOne({
      username: "admin",
      passwordHash: hashedPassword,
    });
    console.log("🌱 Seeded default admin: (user: admin, pass: admin123)");
  }

  const examCount = await db.collection("exams").countDocuments();
  if (examCount === 0) {
    await db.collection("exams").insertOne({
      code: "TECH101",
      title: "Introduction to AI",
      durationMinutes: 30,
      status: "active",
      questions: [
        { id: 1, text: "What is the full form of AI?" },
        { id: 2, text: "Define Machine Learning in one sentence." },
        { id: 3, text: "Who is known as the father of Artificial Intelligence?" },
      ],
    });
    console.log("🌱 Seeded exam: TECH101");
  }
}
