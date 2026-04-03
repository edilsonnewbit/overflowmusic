export const ACCESS_TOKEN_COOKIE = "overflow_access_token";
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 12;

export const LOGIN_STATUS_HINT_COOKIE = "overflow_login_status_hint";
export const LOGIN_STATUS_HINT_TTL_SECONDS = 60 * 60 * 24 * 7;

export type LoginStatusHint = "PENDING_APPROVAL" | "REJECTED";
