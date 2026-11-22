"use client";

import { useCallback } from "react";
import { DataError } from "@/data/errors";
import { useAuth } from "@/features/auth/auth-provider";
import { validateAvatarFile } from "./avatar";
import { uploadAvatar } from "./avatar-upload";
import { userRepository } from "./use-user-profile";

/**
 * Ações do perfil. Cada mudança é gravada nos dois lugares que a exibem:
 * o documento users/{uid} (Firestore) e a conta de autenticação (Firebase Auth).
 */
export function useProfileActions() {
  const { user, updateDisplayName, updatePhotoUrl } = useAuth();

  const requireUid = useCallback(() => {
    if (!user) throw new DataError("unauthenticated");
    return user.uid;
  }, [user]);

  const saveDisplayName = useCallback(
    async (name: string) => {
      const uid = requireUid();
      await Promise.all([
        userRepository.updateProfile(uid, { displayName: name }),
        updateDisplayName(name),
      ]);
    },
    [requireUid, updateDisplayName],
  );

  const savePhoto = useCallback(
    async (file: File) => {
      const invalid = validateAvatarFile(file);
      if (invalid) throw new DataError("invalid", { message: invalid });
      const uid = requireUid();
      const url = await uploadAvatar(uid, file);
      await Promise.all([
        userRepository.updateProfile(uid, { photoUrl: url }),
        updatePhotoUrl(url),
      ]);
    },
    [requireUid, updatePhotoUrl],
  );

  const removePhoto = useCallback(async () => {
    const uid = requireUid();
    await Promise.all([
      userRepository.updateProfile(uid, { photoUrl: null }),
      updatePhotoUrl(null),
    ]);
  }, [requireUid, updatePhotoUrl]);

  return { saveDisplayName, savePhoto, removePhoto };
}
