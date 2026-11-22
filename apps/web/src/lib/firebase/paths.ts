/**
 * Caminhos do Firestore, centralizados para não espalhar strings pelo código.
 * Seguem o Modelo de Dados v1.0 (tudo do usuário em users/{uid}/...).
 */
export const paths = {
  user: (uid: string) => `users/${uid}`,
  preferences: (uid: string) => `users/${uid}/settings/preferences`,
  device: (uid: string, deviceId: string) => `users/${uid}/devices/${deviceId}`,
} as const;

export const SCHEMA_VERSION = 1;
