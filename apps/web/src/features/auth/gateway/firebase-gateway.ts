import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { publicEnv } from "@/lib/env";
import { getFirebaseAuth } from "@/lib/firebase/auth";
import type { BackendMode } from "@/lib/firebase/config";
import { AuthError, toAuthError } from "../errors";
import type { AuthUser, SignUpInput } from "../types";
import type { AuthGateway } from "./types";

export function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    photoUrl: user.photoURL,
    providerIds: user.providerData.map((provider) => provider.providerId),
  };
}

/** Após verificar o e-mail, o link traz o usuário de volta para esta tela. */
function verificationSettings() {
  return { url: `${publicEnv.NEXT_PUBLIC_APP_URL}/verificar-email`, handleCodeInApp: false };
}

export function createFirebaseGateway(
  mode: Extract<BackendMode, "firebase" | "emulator">,
): AuthGateway {
  const auth = () => getFirebaseAuth();

  return {
    mode,

    subscribe(listener) {
      return onAuthStateChanged(auth(), (user) => {
        if (!user) return listener(null);
        // E-mail já confirmado, mas o token salvo é de antes da confirmação (a página recarregou
        // antes de gravar o novo): renova antes de liberar o app, para as Security Rules aceitarem.
        void (async () => {
          if (user.emailVerified) {
            try {
              const { claims } = await user.getIdTokenResult();
              if (claims.email_verified !== true) await user.getIdToken(true);
            } catch {
              // Sem conexão: segue com o token atual; ele é renovado quando a rede voltar.
            }
          }
          listener(toAuthUser(user));
        })();
      });
    },

    async signInWithEmail(email, password) {
      try {
        const { user } = await signInWithEmailAndPassword(auth(), email, password);
        return toAuthUser(user);
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async signUpWithEmail({ name, email, password }: SignUpInput) {
      try {
        const { user } = await createUserWithEmailAndPassword(auth(), email, password);
        await updateProfile(user, { displayName: name });
        // O e-mail sai primeiro: é o passo de que o usuário depende para continuar.
        await sendEmailVerification(user, verificationSettings());
        return { ...toAuthUser(user), displayName: name };
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async signInWithGoogle() {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const { user } = await signInWithPopup(auth(), provider);
        return toAuthUser(user);
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async sendPasswordReset(email) {
      try {
        await sendPasswordResetEmail(auth(), email);
      } catch (error) {
        const authError = toAuthError(error);
        // Resposta neutra: não revelamos se o e-mail tem conta.
        if (authError.code === "invalid-credentials") return;
        throw authError;
      }
    },

    async sendVerificationEmail() {
      const user = auth().currentUser;
      if (!user) throw new AuthError("requires-recent-login");
      try {
        await sendEmailVerification(user, verificationSettings());
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async refreshUser() {
      const user = auth().currentUser;
      if (!user) return null;
      try {
        await reload(user);
        // Renova o token para que as Security Rules vejam email_verified atualizado.
        await user.getIdToken(true);
        return toAuthUser(user);
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async signOut() {
      await signOut(auth());
    },

    async updateDisplayName(name) {
      const user = auth().currentUser;
      if (!user) throw new AuthError("requires-recent-login");
      try {
        await updateProfile(user, { displayName: name });
        return toAuthUser(user);
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async updatePhotoUrl(url) {
      const user = auth().currentUser;
      if (!user) throw new AuthError("requires-recent-login");
      try {
        await updateProfile(user, { photoURL: url });
        return toAuthUser(user);
      } catch (error) {
        throw toAuthError(error);
      }
    },

    async getIdToken(forceRefresh = false) {
      const user = auth().currentUser;
      return user ? user.getIdToken(forceRefresh) : null;
    },

    async reauthenticate(password) {
      const user = auth().currentUser;
      if (!user) throw new AuthError("requires-recent-login");
      try {
        if (password !== null && user.email) {
          await reauthenticateWithCredential(
            user,
            EmailAuthProvider.credential(user.email, password),
          );
        } else {
          await reauthenticateWithPopup(user, new GoogleAuthProvider());
        }
      } catch (error) {
        const authError = toAuthError(error);
        throw authError.code === "invalid-credentials"
          ? new AuthError("wrong-current-password")
          : authError;
      }
    },

    async changePassword(currentPassword, newPassword) {
      const user = auth().currentUser;
      if (!user?.email) throw new AuthError("requires-recent-login");
      try {
        await reauthenticateWithCredential(
          user,
          EmailAuthProvider.credential(user.email, currentPassword),
        );
      } catch (error) {
        const authError = toAuthError(error);
        throw authError.code === "invalid-credentials"
          ? new AuthError("wrong-current-password")
          : authError;
      }
      try {
        await updatePassword(user, newPassword);
      } catch (error) {
        throw toAuthError(error);
      }
    },
  };
}
