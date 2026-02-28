import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME;

let isConnected = false;

export async function connectAtlas(): Promise<void> {
  if (isConnected) return;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required for Atlas connection");
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: DB_NAME || undefined,
    autoIndex: process.env.NODE_ENV !== "production",
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  isConnected = true;
  const db = mongoose.connection.db;
  console.log(`[VoiceSecure] Mongoose connected: db=${db?.databaseName}`);
}

export async function disconnectAtlas(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}
