import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthPayload, AdminRole } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "voicesecure-dev-secret";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signAdminToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Missing bearer token" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ success: false, message: "Insufficient role permissions" });
      return;
    }

    next();
  };
}
