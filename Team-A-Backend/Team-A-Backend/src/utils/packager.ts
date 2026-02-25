// Zips final data for submission

export async function packageSubmission(sessionId: string): Promise<string> {
  // TODO: Zip candidate/session data for secure submission.
  return `${sessionId}.zip`;
}
