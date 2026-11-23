import { apiHeaders } from "@/lib/api-client";

/** Pede ao servidor a exclusão definitiva da conta e de todos os dados. */
export async function requestAccountDeletion(idToken: string): Promise<void> {
  const response = await fetch("/api/conta/excluir", {
    method: "POST",
    headers: await apiHeaders(idToken),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Não foi possível excluir a conta agora. Tente de novo.");
  }
}
