import { timingSafeEqual } from "node:crypto";
import { purgeDeleted } from "@/server/account/purge-deleted";
import { adminApp, adminDb } from "@/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(header: string | null): boolean {
  const secret = process.env.MAINTENANCE_SECRET?.trim();
  const sent = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!secret || !sent || sent.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(sent), Buffer.from(secret));
}

/**
 * POST /api/manutencao/limpeza: chamado uma vez por dia pelo Cloud Scheduler com
 * `Authorization: Bearer $MAINTENANCE_SECRET`. Apaga de vez os itens excluídos há mais de 30 dias.
 */
export async function POST(request: Request): Promise<Response> {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ message: "Não autorizado." }, { status: 401 });
  }
  const app = adminApp();
  if (!app) return Response.json({ removed: 0 });
  const removed = await purgeDeleted(adminDb(app));
  return Response.json({ removed });
}
