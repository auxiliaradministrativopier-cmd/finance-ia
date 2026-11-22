"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { backendMode, type BackendMode } from "@/lib/firebase/config";
import { createAuthGateway, type AuthGateway } from "./gateway";
import type { AuthStatus, AuthUser, SignUpInput } from "./types";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  mode: BackendMode;
  /** Verdadeiro quando a sessão terminou porque o usuário escolheu sair (e não por expiração). */
  signedOutByUser: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthUser>;
  signUpWithEmail: (input: SignUpInput) => Promise<AuthUser>;
  signInWithGoogle: () => Promise<AuthUser>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<AuthUser>;
  updatePhotoUrl: (url: string | null) => Promise<AuthUser>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Token para chamar as rotas /api do próprio app. */
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  /** Permite injetar outra implementação (testes, Storybook). */
  gateway?: AuthGateway;
}

export function AuthProvider({ children, gateway: injected }: AuthProviderProps) {
  const [gateway] = useState<AuthGateway>(() => injected ?? createAuthGateway(backendMode));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [signedOutByUser, setSignedOutByUser] = useState(false);

  useEffect(() => {
    return gateway.subscribe((next) => {
      setUser(next);
      setStatus(next ? "authenticated" : "unauthenticated");
    });
  }, [gateway]);

  // As ações atualizam o estado na hora, sem esperar o próximo evento do provedor.
  const applyUser = useCallback((next: AuthUser | null) => {
    if (next) setSignedOutByUser(false);
    setUser(next);
    setStatus(next ? "authenticated" : "unauthenticated");
    return next;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      mode: gateway.mode,
      signedOutByUser,
      signInWithEmail: async (email, password) =>
        applyUser(await gateway.signInWithEmail(email, password)) as AuthUser,
      signUpWithEmail: async (input) => applyUser(await gateway.signUpWithEmail(input)) as AuthUser,
      signInWithGoogle: async () => applyUser(await gateway.signInWithGoogle()) as AuthUser,
      sendPasswordReset: (email) => gateway.sendPasswordReset(email),
      sendVerificationEmail: () => gateway.sendVerificationEmail(),
      refreshUser: async () => applyUser(await gateway.refreshUser()),
      signOut: async () => {
        setSignedOutByUser(true);
        await gateway.signOut();
        applyUser(null);
      },
      updateDisplayName: async (name) =>
        applyUser(await gateway.updateDisplayName(name)) as AuthUser,
      updatePhotoUrl: async (url) => applyUser(await gateway.updatePhotoUrl(url)) as AuthUser,
      changePassword: (currentPassword, newPassword) =>
        gateway.changePassword(currentPassword, newPassword),
      getIdToken: () => gateway.getIdToken(),
    }),
    [status, user, gateway, applyUser, signedOutByUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return context;
}
