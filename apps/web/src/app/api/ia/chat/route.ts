import { anthropicStreamer } from "@/server/ai/anthropic-streamer";
import { createChatHandler } from "@/server/ai/chat-handler";
import { aiConfig } from "@/server/ai/config";
import { createFirestoreRateLimiter } from "@/server/ai/rate-limit";
import { verifyAppCheck, verifyUser } from "@/server/auth/verify-user";
import { adminApp, adminDb } from "@/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Até 12 perguntas a cada 10 minutos e 80 por dia, por usuário, contadas no Firestore
// (vale para todas as instâncias do servidor). Sem Firebase, conta na memória.
const limiter = createFirestoreRateLimiter(() => {
  const app = adminApp();
  return app ? adminDb(app) : null;
}, [
  { windowMs: 10 * 60_000, max: 12 },
  { windowMs: 24 * 60 * 60_000, max: 80 },
]);

export const POST = createChatHandler({
  verify: verifyUser,
  appCheck: verifyAppCheck,
  limiter,
  config: aiConfig,
  stream: anthropicStreamer,
});
