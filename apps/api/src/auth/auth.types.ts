export type UserRole = "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";
export type UserStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type VolunteerArea = "MUSICA" | "MIDIA" | "DANCA" | "INTERCESSAO" | "SUPORTE";

export const VOLUNTEER_AREAS: Record<VolunteerArea, { label: string; skills: string[] }> = {
  MUSICA: {
    label: "Música",
    skills: ["Vocal", "Violão", "Guitarra", "Baixo", "Bateria", "Teclado", "Piano", "Trompete", "Saxofone", "Violino", "Flauta", "Percussão", "Gaita", "Contrabaixo"],
  },
  MIDIA: {
    label: "Mídia",
    skills: ["Câmera", "Transmissão ao vivo", "Edição de vídeo", "Fotografia", "Slides/ProPresenter", "Iluminação", "Som/PA"],
  },
  DANCA: {
    label: "Dança",
    skills: ["Coreógrafo(a)", "Bailarino(a)", "Dança contemporânea", "Dança circular"],
  },
  INTERCESSAO: {
    label: "Intercessão",
    skills: ["Intercessor(a)", "Líder de oração", "Grupo de jejum"],
  },
  SUPORTE: {
    label: "Suporte",
    skills: ["Recepção", "Logística", "Segurança", "Ministério infantil", "Limpeza/organização"],
  },
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  googleSub?: string;
  role: UserRole;
  status: UserStatus;
  instruments: string[];
  volunteerArea?: string | null;
  instagramProfile?: string | null;
  birthDate?: string | null;
  church?: string | null;
  pastorName?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  volunteerTermsVersion?: string | null;
  volunteerTermsAcceptedAt?: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};
