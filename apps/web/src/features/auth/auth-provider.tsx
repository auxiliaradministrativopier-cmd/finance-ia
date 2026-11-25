"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { resetDataStore } from "@/data/store";
import { backendMode, type BackendMode } from "@/lib/firebase/config";
import { createAuthGateway, runUserSetup, type AuthGateway } from "./gateway";
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
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  /** Confirma a identidade de novo (senha ou Google) antes de ações sensíveis. */
  reauthenticate: (password: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  /** Permite injetar outra implementação (testes, Storybook). */
  gateway?: AuthGateway;
  /** Configuração inicial ao abrir uma sessão já logada (padrão: perfil, preferências e categorias). */
  setup?: (user: AuthUser) => Promise<void>;
}

export function AuthProvider({ children, gateway: injected, setup }: AuthProviderProps) {
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

  // Garante a configuração inicial também em sessões já abertas: se o cadastro foi interrompido
  // (aba fechada ou página recarregada antes de gravar), perfil e categorias são criados agora.
  // Uma vez por usuário nesta aba.
  // Durante um login ou cadastro explícito, quem configura é o próprio fluxo (com o nome digitado).
  const setupDone = useRef<string | null>(null);
  const signingIn = useRef(false);
  useEffect(() => {
    if (!user || signingIn.current || setupDone.current === user.uid) return;
    if (gateway.mode === "unconfigured") return;
    setupDone.current = user.uid;
    void (setup ?? runUserSetup)(user);
  }, [user, gateway.mode, setup]);

  // As ações atualizam o estado na hora, sem esperar o próximo evento do provedor.
  const applyUser = useCallback((next: AuthUser | null) => {
    if (next) setSignedOutByUser(false);
    setUser(next);
    setStatus(next ? "authenticated" : "unauthenticated");
    return next;
  }, []);

  /** Login/cadastro: o gateway já faz a configuração inicial; a abertura de sessão não repete. */
  const signIn = useCallback(
    async (action: () => Promise<AuthUser>): Promise<AuthUser> => {
      signingIn.current = true;
      try {
        const next = await action();
        setupDone.current = next.uid;
        return applyUser(next) as AuthUser;
      } finally {
        signingIn.current = false;
      }
    },
    [applyUser],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      mode: gateway.mode,
      signedOutByUser,
      signInWithEmail: (email, password) => signIn(() => gateway.signInWithEmail(email, password)),
      signUpWithEmail: (input) => signIn(() => gateway.signUpWithEmail(input)),
      signInWithGoogle: () => signIn(() => gateway.signInWithGoogle()),
      sendPasswordReset: (email) => gateway.sendPasswordReset(email),
      sendVerificationEmail: () => gateway.sendVerificationEmail(),
      refreshUser: async () => applyUser(await gateway.refreshUser()),
      signOut: async () => {
        setSignedOutByUser(true);
        await gateway.signOut();
        applyUser(null);
        // Depois de sair, nenhum dado financeiro fica no cache local do navegador.
        await resetDataStore().catch(() => undefined);
      },
      updateDisplayName: async (name) =>
        applyUser(await gateway.updateDisplayName(name)) as AuthUser,
      updatePhotoUrl: async (url) => applyUser(await gateway.updatePhotoUrl(url)) as AuthUser,
      changePassword: (currentPassword, newPassword) =>
        gateway.changePassword(currentPassword, newPassword),
      getIdToken: (forceRefresh) => gateway.getIdToken(forceRefresh),
      reauthenticate: (password) => gateway.reauthenticate(password),
    }),
    [status, user, gateway, applyUser, signIn, signedOutByUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return context;
}
