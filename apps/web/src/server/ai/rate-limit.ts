/**
 * Limite de uso por usuário em janelas deslizantes (memória do processo).
 * Em produção com várias instâncias, troque por um contador compartilhado (ex.: Firestore ou Redis).
 */
export interface RateLimitRule {
  windowMs: number;
  max: number;
}

export function createRateLimiter(rules: RateLimitRule[], now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...rules.map((rule) => rule.windowMs));
  return {
    take(key: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
      const time = now();
      const recent = (hits.get(key) ?? []).filter((at) => time - at < longest);
      for (const rule of rules) {
        const inWindow = recent.filter((at) => time - at < rule.windowMs);
        if (inWindow.length >= rule.max) {
          const oldest = inWindow[0]!;
          hits.set(key, recent);
          return {
            ok: false,
            retryAfterSeconds: Math.max(Math.ceil((oldest + rule.windowMs - time) / 1000), 1),
          };
        }
      }
      recent.push(time);
      hits.set(key, recent);
      return { ok: true };
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
