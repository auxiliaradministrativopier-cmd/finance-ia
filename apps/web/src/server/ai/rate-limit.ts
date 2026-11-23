import type { Firestore } from "firebase-admin/firestore";

/**
 * Limite de uso por usuário em janelas deslizantes.
 * - `createFirestoreRateLimiter`: contador compartilhado entre todas as instâncias do servidor
 *   (coleção `rateLimits`, sem acesso pelo app: não há regra para ela).
 * - `createRateLimiter`: em memória, para o modo demonstração e para testes.
 */
export interface RateLimitRule {
  windowMs: number;
  max: number;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export interface RateLimiter {
  take(key: string): Promise<RateLimitResult>;
}

/** Decide com base nos registros anteriores; devolve a lista atualizada para gravar. */
export function evaluate(
  rules: RateLimitRule[],
  previous: number[],
  time: number,
): { result: RateLimitResult; hits: number[] } {
  const longest = Math.max(...rules.map((rule) => rule.windowMs));
  const recent = previous.filter((at) => time - at < longest);
  for (const rule of rules) {
    const inWindow = recent.filter((at) => time - at < rule.windowMs);
    if (inWindow.length >= rule.max) {
      const oldest = inWindow[0]!;
      const retryAfterSeconds = Math.max(Math.ceil((oldest + rule.windowMs - time) / 1000), 1);
      return { result: { ok: false, retryAfterSeconds }, hits: recent };
    }
  }
  return { result: { ok: true }, hits: [...recent, time] };
}

export function createRateLimiter(
  rules: RateLimitRule[],
  now: () => number = Date.now,
): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    async take(key) {
      const { result, hits: next } = evaluate(rules, hits.get(key) ?? [], now());
      hits.set(key, next);
      return result;
    },
  };
}

export function createFirestoreRateLimiter(
  db: () => Firestore | null,
  rules: RateLimitRule[],
  fallback: RateLimiter = createRateLimiter(rules),
  now: () => number = Date.now,
): RateLimiter {
  return {
    async take(key) {
      const firestore = db();
      if (!firestore) return fallback.take(key);
      const ref = firestore.collection("rateLimits").doc(key);
      return firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const previous = (snapshot.get("hits") as number[] | undefined) ?? [];
        const { result, hits } = evaluate(rules, previous, now());
        transaction.set(ref, { hits, updatedAt: new Date() });
        return result;
      });
    },
  };
}
