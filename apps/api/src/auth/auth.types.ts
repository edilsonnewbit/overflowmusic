export type UserRole = "SUPER_ADMIN" | "ADMIN" | "LEADER" | "MEMBER";
export type UserStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  googleSub?: string;
  role: UserRole;
  status: UserStatus;
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
