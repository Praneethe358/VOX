export type AdminRole = "super-admin" | "exam-admin";

export interface AuthPayload {
  adminId: string;
  email: string;
  role: AdminRole;
}
