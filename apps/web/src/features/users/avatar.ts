/** Regras da foto de perfil (Mapa de Telas 52). Espelham firebase/storage.rules. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const extensions: Record<(typeof AVATAR_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateAvatarFile(file: Pick<File, "type" | "size">): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return "Use uma imagem JPG, PNG ou WEBP.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "A imagem precisa ter até 5 MB.";
  }
  return null;
}

export function avatarFileName(type: string): string {
  return `avatar.${extensions[type as keyof typeof extensions] ?? "jpg"}`;
}
