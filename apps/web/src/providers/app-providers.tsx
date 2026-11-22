"use client";

import { ThemeProvider } from "next-themes";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/features/auth/auth-provider";
import { PrivacyProvider } from "./privacy-provider";

/** Provedores globais, do mais externo (tema) ao mais interno (avisos). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <PrivacyProvider>
          <ToastProvider>
            {children}
            <ServiceWorkerRegistration />
          </ToastProvider>
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
