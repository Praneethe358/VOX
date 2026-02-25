export interface AuditDocument {
  studentId: string;
  examCode: string;
  action: string;
  metadata?: unknown;
  timestamp: string;
}
