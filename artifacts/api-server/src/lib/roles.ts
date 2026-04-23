export const ROLES = ["SA", "only_read", "robot", "human"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  SA: "Super Admin",
  only_read: "Somente leitura",
  robot: "Robo (leitura/gravacao)",
  human: "Usuario",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function canRead(role: Role): boolean {
  return role === "SA" || role === "only_read" || role === "robot" || role === "human";
}

export function canWrite(role: Role): boolean {
  return role === "SA" || role === "robot";
}

export function isAdmin(role: Role): boolean {
  return role === "SA";
}
