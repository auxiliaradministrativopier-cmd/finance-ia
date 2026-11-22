"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { SplashScreen } from "@/components/feedback/splash-screen";
import { useAuth } from "./auth-provider";
import { destinationFor, ROUTES, signInPathWithNext } from "./redirect";

/**
 * Protege a área logada. Sem sessão → /entrar (com retorno à página pedida);
 * e-mail não confirmado → /verificar-email.
 *
 * A proteção definitiva dos dados é feita pelas Security Rules; este guarda cuida da navegação.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, user, signedOutByUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = status === "authenticated" && user?.emailVerified === true;

  useEffect(() => {
    if (status === "unauthenticated") {
      // Saiu por vontade própria → boas-vindas; sessão expirada → login, voltando à página atual.
      router.replace(signedOutByUser ? ROUTES.welcome : signInPathWithNext(pathname));
    } else if (status === "authenticated" && user && !user.emailVerified) {
      router.replace(ROUTES.verifyEmail);
    }
  }, [status, user, pathname, router, signedOutByUser]);

  return allowed ? children : <SplashScreen />;
}

/**
 * Telas só para visitantes (boas-vindas, entrar, cadastro): quem já entrou segue para o app.
 * Também conclui o login: quando a sessão é aplicada, leva o usuário ao destino certo.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SplashScreen />}>
      <GuestOnlyGate>{children}</GuestOnlyGate>
    </Suspense>
  );
}

function GuestOnlyGate({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  useEffect(() => {
    if (status === "authenticated") router.replace(destinationFor(user, next));
  }, [status, user, next, router]);

  return status === "unauthenticated" ? children : <SplashScreen />;
}

/** Telas que exigem sessão, mas não e-mail confirmado (verificação de e-mail, duas etapas). */
export function RequireSession({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace(ROUTES.signIn);
  }, [status, router]);

  return status === "authenticated" ? children : <SplashScreen />;
}

/** Splash da raiz: decide o destino assim que a sessão é conhecida. */
export function SessionRedirect() {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading") router.replace(destinationFor(user));
  }, [status, user, router]);

  return <SplashScreen />;
}
