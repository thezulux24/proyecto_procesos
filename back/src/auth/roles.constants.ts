export const APP_ROLES = ['ADMIN', 'OPERADOR'] as const;
export type AppRole = (typeof APP_ROLES)[number];
