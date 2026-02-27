/**
 * exam.utils.ts - Utility functions for exam session management
 */

export function calculateExamStats(answers: Record<string, string>, totalQuestions: number, marksPerQuestion: number) {
  const answeredCount = Object.keys(answers).length;
  const answeredPercentage = (answeredCount / totalQuestions) * 100;
  const potentialScore = answeredCount * marksPerQuestion;

  return {
    answeredCount,
    answeredPercentage,
    potentialScore,
    totalPossible: totalQuestions * marksPerQuestion
  };
}

export function formatExamDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

export function validateAnswer(answer: string, minLength: number = 10): { valid: boolean; error?: string } {
  if (!answer || answer.trim().length === 0) {
    return { valid: false, error: 'Answer cannot be empty' };
  }

  if (answer.trim().length < minLength) {
    return { valid: false, error: `Answer must be at least ${minLength} characters` };
  }

  return { valid: true };
}

export function generateExamId(): string {
  return `exam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateTimeRemaining(startTime: Date, durationMinutes: number): number {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  const now = new Date();
  const remaining = Math.max(0, endTime.getTime() - now.getTime());
  return Math.floor(remaining / 1000); // Return in seconds
}

export function isExamTimeUp(startTime: Date, durationMinutes: number): boolean {
  return calculateTimeRemaining(startTime, durationMinutes) <= 0;
}

export function formattedDateTime(date: Date): string {
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}
