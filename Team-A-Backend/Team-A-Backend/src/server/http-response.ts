import { Response } from 'express';

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): void {
  const payload: Envelope<T> = { success: true, data };
  if (message) payload.message = message;
  res.status(statusCode).json(payload);
}

export function sendError(res: Response, error: string, statusCode = 500, message?: string): void {
  const payload: Envelope<never> = { success: false, error };
  if (message) payload.message = message;
  res.status(statusCode).json(payload);
}
