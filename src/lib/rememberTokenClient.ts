// Client-safe constant shared between RememberMeSync.tsx and the login page — kept separate from
// rememberToken.ts since that file imports server-only modules (prisma, node:crypto).
export const REMEMBER_TOKEN_STORAGE_KEY = "t2r_remember_token";
