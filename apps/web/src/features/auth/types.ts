/** Usuário autenticado, independente do provedor (Firebase, emulador ou demonstração). */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  photoUrl: string | null;
  /** Ex.: "password", "google.com". */
  providerIds: string[];
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}
