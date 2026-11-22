import { anthropicStreamer } from "@/server/ai/anthropic-streamer";
import { createChatHandler } from "@/server/ai/chat-handler";
import { aiConfig } from "@/server/ai/config";
import { createRateLimiter } from "@/server/ai/rate-limit";
import { verifyUser } from "@/server/auth/verify-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Até 12 perguntas a cada 10 minutos e 80 por dia, por usuário.
const limiter = createRateLimiter([
  { windowMs: 10 * 60_000, max: 12 },
  { windowMs: 24 * 60 * 60_000, max: 80 },
]);

export const POST = createChatHandler({
  verify: verifyUser,
  limiter,
  config: aiConfig,
  stream: anthropicStreamer,
});
