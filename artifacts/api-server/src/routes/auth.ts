import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}
const SECRET: string = JWT_SECRET;

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Nao autenticado" });
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, SECRET) as AuthUser & { iat: number; exp: number };
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch {
    res.status(401).json({ error: "Token invalido ou expirado" });
  }
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    res.status(400).json({ error: "Informe email e senha" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = jwt.sign(authUser, SECRET, { expiresIn: "7d" });

    res.json({ token, user: authUser });
  } catch (err) {
    logger.error({ err }, "login failed");
    res.status(500).json({ error: "Erro interno" });
  }
});

router.get("/auth/me", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  res.json({ user: req.user });
});

export default router;
