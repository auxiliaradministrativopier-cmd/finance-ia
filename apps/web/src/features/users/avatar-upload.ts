import { avatarFileName } from "./avatar";
import { DataError, toDataError } from "@/data/errors";
import { backendMode } from "@/lib/firebase/config";

/** Envia a foto de perfil e devolve a URL. No modo demonstração, a imagem fica só no navegador. */
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (backendMode === "demo") return URL.createObjectURL(file);
  if (backendMode === "unconfigured") throw new DataError("unavailable");
  try {
    const [{ getDownloadURL, ref, uploadBytes }, { getFirebaseStorage }] = await Promise.all([
      import("firebase/storage"),
      import("@/lib/firebase/storage"),
    ]);
    const avatarRef = ref(getFirebaseStorage(), `users/${uid}/avatar/${avatarFileName(file.type)}`);
    await uploadBytes(avatarRef, file, {
      contentType: file.type,
      cacheControl: "private, max-age=3600",
    });
    return await getDownloadURL(avatarRef);
  } catch (error) {
    throw toDataError(error);
  }
}
