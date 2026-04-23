import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../app";
import { logger } from "../lib/logger";
import { canWrite, isAdmin, isRole, type Role } from "../lib/roles";

const router: IRouter = Router();

const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}
const SECRET: string = JWT_SECRET;

const USERS_TABLE = "app_users";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: Role;
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
    if (!isRole(payload.role)) {
      res.status(401).json({ error: "Papel de usuario invalido" });
      return;
    }
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
    const { data: user, error } = await supabase
      .from(USERS_TABLE)
      .select("id, email, name, password_hash, role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      logger.error({ err: error }, "supabase select user failed");
      if (String(error.message).includes("does not exist")) {
        res.status(500).json({
          error:
            "Tabela app_users nao existe no Supabase. Execute o script artifacts/api-server/supabase-users.sql.",
        });
        return;
      }
      res.status(500).json({ error: "Erro ao consultar usuarios" });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Credenciais invalidas" });
      return;
    }

    if (!isRole(user.role)) {
      res.status(500).json({ error: "Papel de usuario invalido no banco" });
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

export function requireWrite(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !canWrite(req.user.role)) {
    res.status(403).json({ error: "Sem permissao de gravacao" });
    return;
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !isAdmin(req.user.role)) {
    res.status(403).json({ error: "Acesso restrito ao administrador" });
    return;
  }
  next();
}

interface SeedUser {
  email: string;
  name: string;
  role: Role;
  password: string;
}

const SEED_USERS: SeedUser[] = [
  { email: "admin@greencore.com",   name: "Administrador",   role: "SA",        password: "admin123" },
  { email: "leitura@greencore.com", name: "Usuario Leitura", role: "only_read", password: "leitura123" },
  { email: "robot@greencore.com",   name: "Robo Integracao", role: "robot",     password: "robot123" },
  { email: "usuario@greencore.com", name: "Usuario Geral",   role: "human",     password: "usuario123" },
];

export async function seedUsersIfEmpty(): Promise<void> {
  const { count, error } = await supabase
    .from(USERS_TABLE)
    .select("id", { count: "exact", head: true });

  if (error) {
    if (String(error.message).includes("does not exist")) {
      logger.warn(
        "Tabela app_users nao existe no Supabase. Execute artifacts/api-server/supabase-users.sql no SQL Editor.",
      );
      return;
    }
    logger.error({ err: error }, "seed: failed to count users");
    return;
  }

  if ((count ?? 0) > 0) {
    logger.info({ count }, "seed: app_users ja possui registros, ignorando seed");
    return;
  }

  const rows = await Promise.all(
    SEED_USERS.map(async (u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      password_hash: await bcrypt.hash(u.password, 10),
    })),
  );

  const { error: insertError } = await supabase.from(USERS_TABLE).insert(rows);
  if (insertError) {
    logger.error({ err: insertError }, "seed: failed to insert users");
    return;
  }
  logger.info({ inserted: rows.length }, "seed: usuarios padrao criados em app_users");
}

export default router;
