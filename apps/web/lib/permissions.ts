import type { AuthUser } from "./types";

type VolunteerArea = "MUSICA" | "MIDIA" | "DANCA" | "INTERCESSAO" | "SUPORTE";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);
const LEADER_OR_ABOVE = new Set(["SUPER_ADMIN", "ADMIN", "LEADER"]);

function getArea(user: AuthUser): VolunteerArea | null {
  return (user.volunteerArea as VolunteerArea | null) ?? null;
}

function isAdminOrAbove(user: AuthUser) {
  return ADMIN_ROLES.has(user.role);
}

function isLeaderOrAbove(user: AuthUser) {
  return LEADER_OR_ABOVE.has(user.role);
}

/** MEMBER sem área definida deve completar o perfil antes de acessar o sistema */
export function needsAreaSetup(user: AuthUser): boolean {
  return user.role === "MEMBER" && !getArea(user);
}

/** Pode criar/editar eventos */
export function canManageEvents(user: AuthUser): boolean {
  return isLeaderOrAbove(user);
}

/** Vê a página de músicas */
export function canSeeSongsPage(user: AuthUser): boolean {
  if (isLeaderOrAbove(user)) return true;
  const a = getArea(user);
  return a === "MUSICA" || a === "MIDIA" || a === "DANCA";
}

/** Acesso completo à música (cifras, tracks, player, editar) */
export function canSeeFullSongDetail(user: AuthUser): boolean {
  if (isLeaderOrAbove(user)) return true;
  return getArea(user) === "MUSICA";
}

/** Pode criar/editar/importar músicas */
export function canManageSongs(user: AuthUser): boolean {
  return isLeaderOrAbove(user);
}

/** Vê a página de ensaios */
export function canSeeRehearsals(user: AuthUser): boolean {
  if (isLeaderOrAbove(user)) return true;
  return getArea(user) === "MUSICA";
}

/** Pode criar/editar/deletar ensaios */
export function canManageRehearsals(user: AuthUser): boolean {
  return isLeaderOrAbove(user);
}

/** Vê a página de checklists */
export function canSeeChecklists(user: AuthUser): boolean {
  if (isLeaderOrAbove(user)) return true;
  const a = getArea(user);
  return a === "MUSICA" || a === "MIDIA" || a === "SUPORTE";
}

/** Pode criar/editar/deletar templates de checklist */
export function canManageChecklistTemplates(user: AuthUser): boolean {
  return isAdminOrAbove(user);
}

/** Vê links administrativos no menu */
export function canSeeAdminLinks(user: AuthUser): boolean {
  return isAdminOrAbove(user);
}

/** Vê link de audições no menu */
export function canSeeAudicoes(user: AuthUser): boolean {
  return isLeaderOrAbove(user);
}
