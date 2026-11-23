// @vitest-environment node
import { createFirestoreRateLimiter, createRateLimiter, evaluate } from "../ai/rate-limit";

const rules = [
  { windowMs: 60_000, max: 2 },
  { windowMs: 3_600_000, max: 3 },
];

describe("limite de uso", () => {
  it("bloqueia ao passar do limite da janela e diz quando tentar de novo", () => {
    expect(evaluate(rules, [], 1_000).result).toEqual({ ok: true });
    expect(evaluate(rules, [0, 10_000], 20_000).result).toEqual({
      ok: false,
      retryAfterSeconds: 40,
    });
    // A janela curta liberou, mas a longa (3 por hora) não.
    expect(evaluate(rules, [0, 70_000, 140_000], 200_000).result.ok).toBe(false);
  });

  it("descarta registros fora da janela mais longa", () => {
    expect(evaluate(rules, [0], 4_000_000).hits).toEqual([4_000_000]);
  });

  it("o contador compartilhado grava no Firestore e cai para a memória sem banco", async () => {
    const stored = new Map<string, number[]>();
    const fakeDb = {
      collection: () => ({ doc: (id: string) => ({ id }) }),
      runTransaction: async <T>(run: (t: unknown) => Promise<T>) =>
        run({
          get: async (ref: { id: string }) => ({ get: () => stored.get(ref.id) }),
          set: (ref: { id: string }, data: { hits: number[] }) => stored.set(ref.id, data.hits),
        }),
    };
    let time = 0;
    const limiter = createFirestoreRateLimiter(
      () => fakeDb as never,
      rules,
      undefined,
      () => (time += 1_000),
    );
    expect(await limiter.take("u1")).toEqual({ ok: true });
    expect(await limiter.take("u1")).toEqual({ ok: true });
    expect((await limiter.take("u1")).ok).toBe(false);
    expect(stored.get("u1")).toHaveLength(2);

    const memory = createFirestoreRateLimiter(() => null, rules, createRateLimiter(rules));
    expect(await memory.take("u2")).toEqual({ ok: true });
  });
});
