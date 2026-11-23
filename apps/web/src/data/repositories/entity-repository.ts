import type { z } from "zod";
import { DataError, toDataError } from "../errors";
import { readMeta, type EntityMeta } from "../models/common";
import type { DataStore, DocumentData, StoredDocument, WriteOperation } from "../store/types";

export const SCHEMA_VERSION = 1;

/**
 * Entidade lida do banco: campos de entrada + metadados + campos derivados (sempre gravados pelo app)
 * + campos calculados pelo servidor (podem ainda não existir).
 */
export type Entity<
  TSchema extends z.ZodType,
  TServer extends object = object,
  TDerived extends object = object,
> = z.output<TSchema> & EntityMeta & TDerived & Partial<TServer>;

export interface EntityRepositoryConfig<TSchema extends z.ZodType> {
  /** Nome da subcoleção em users/{uid}/. */
  collection: string;
  schema: TSchema;
  /** Ordenação da lista (feita no app para não exigir índices compostos). */
  sort?: (a: DocumentData, b: DocumentData) => number;
  /** Campos derivados gravados junto com a entrada (ex.: mês a partir da data). */
  derive?: (data: z.output<TSchema>) => DocumentData;
  /** Nome amigável para mensagens, ex.: "a categoria". */
  label: string;
}

export interface ListOptions {
  /** Inclui itens arquivados (categorias, contas e cartões). Padrão: não. */
  includeArchived?: boolean;
}

/** Converte os erros do Zod em DataError com mensagens por campo. */
export function validationError(error: z.ZodError): DataError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return new DataError("invalid", { fields });
}

/** Remove valores undefined (o Firestore não os aceita). */
function clean(data: DocumentData): DocumentData {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

/**
 * CRUD de uma coleção do usuário (users/{uid}/{collection}).
 * - Validação com Zod antes de qualquer escrita; as Security Rules validam de novo no servidor.
 * - Exclusão é sempre lógica (deletedAt): o histórico financeiro nunca se perde.
 */
export function createEntityRepository<
  TSchema extends z.ZodType,
  TServer extends object = object,
  TDerived extends object = object,
>(getStore: () => Promise<DataStore>, config: EntityRepositoryConfig<TSchema>) {
  type Model = Entity<TSchema, TServer, TDerived>;
  const collectionPath = (uid: string) => `users/${uid}/${config.collection}`;
  const docPath = (uid: string, id: string) => `${collectionPath(uid)}/${id}`;

  /**
   * Leitura validada: os campos de entrada passam pelo schema (que também preenche padrões de
   * campos novos). Documento inválido (antigo, corrompido) volta null e fica de fora das listas,
   * em vez de quebrar a tela. O resultado fica em cache por versão do documento (updatedAt).
   */
  const validated = new Map<string, { version: number; model: Model | null }>();
  function toModel({ id, data }: StoredDocument): Model | null {
    const updatedAt = data.updatedAt instanceof Date ? data.updatedAt.getTime() : null;
    const cached = updatedAt !== null ? validated.get(id) : undefined;
    if (cached && cached.version === updatedAt) return cached.model;
    const result = config.schema.safeParse(inputFields(data));
    let model: Model | null = null;
    if (result.success) {
      model = { ...data, ...(result.data as DocumentData), ...readMeta(id, data) } as Model;
    } else {
      console.warn(`Documento inválido ignorado em ${config.collection}: ${id}`);
    }
    if (updatedAt !== null) validated.set(id, { version: updatedAt, model });
    return model;
  }

  const visible = (docs: StoredDocument[], options: ListOptions) =>
    docs
      .filter((item) => options.includeArchived || item.data.archived !== true)
      .sort((a, b) => (config.sort ? config.sort(a.data, b.data) : 0))
      .map(toModel)
      .filter((item): item is Model => item !== null);

  function parse(input: unknown): z.output<TSchema> {
    const result = config.schema.safeParse(input);
    if (!result.success) throw validationError(result.error);
    return result.data;
  }

  /** Campos de entrada de um documento salvo (sem metadados nem campos do servidor). */
  const META_FIELDS = new Set(["createdAt", "updatedAt", "deletedAt", "schemaVersion"]);
  function inputFields(data: DocumentData): DocumentData {
    return Object.fromEntries(Object.entries(data).filter(([key]) => !META_FIELDS.has(key)));
  }

  async function getRaw(uid: string, id: string): Promise<StoredDocument> {
    const store = await getStore();
    const found = await store.get(docPath(uid, id));
    if (!found || found.data.deletedAt) {
      throw new DataError("not-found", {
        message: `Não encontramos ${config.label}. Ela pode ter sido removida.`,
      });
    }
    return found;
  }

  return {
    collection: config.collection,

    async list(uid: string, options: ListOptions = {}): Promise<Model[]> {
      const store = await getStore();
      try {
        return visible(
          await store.query(collectionPath(uid), { where: [["deletedAt", "==", null]] }),
          options,
        );
      } catch (error) {
        throw toDataError(error);
      }
    },

    /** Acompanha a lista em tempo real. Retorna a função para parar. */
    watch(
      uid: string,
      options: ListOptions,
      onNext: (items: Model[]) => void,
      onError: (error: DataError) => void,
    ): () => void {
      let stop: (() => void) | null = null;
      let cancelled = false;
      getStore()
        .then((store) => {
          if (cancelled) return;
          stop = store.watchQuery(
            collectionPath(uid),
            { where: [["deletedAt", "==", null]] },
            (docs) => onNext(visible(docs, options)),
            (error) => onError(toDataError(error)),
          );
        })
        .catch((error) => onError(toDataError(error)));
      return () => {
        cancelled = true;
        stop?.();
      };
    },

    async get(uid: string, id: string): Promise<Model> {
      const model = toModel(await getRaw(uid, id));
      if (!model) {
        throw new DataError("invalid", {
          message: `Não foi possível ler ${config.label}. Os dados parecem incompletos.`,
        });
      }
      return model;
    },

    /** Gera um id novo (para montar lotes que referenciam o documento antes de gravá-lo). */
    async newId(uid: string): Promise<string> {
      return (await getStore()).newId(collectionPath(uid));
    },

    /** Prepara a criação (validada) para um lote. */
    async buildCreate(
      uid: string,
      input: unknown,
      options: { id?: string } = {},
    ): Promise<WriteOperation & { id: string }> {
      const data = parse(input);
      const store = await getStore();
      const id = options.id ?? store.newId(collectionPath(uid));
      return {
        id,
        type: "set",
        path: docPath(uid, id),
        data: clean({
          ...(data as DocumentData),
          ...(config.derive?.(data) ?? {}),
          createdAt: store.now(),
          updatedAt: store.now(),
          deletedAt: null,
          schemaVersion: SCHEMA_VERSION,
        }),
      };
    },

    /** Prepara uma atualização (o documento resultante inteiro é validado) para um lote. */
    async buildUpdate(
      uid: string,
      id: string,
      patch: Partial<z.input<TSchema>>,
      /** Somas atômicas a campos numéricos (ex.: saldo), validadas com o valor resultante. */
      increments: Record<string, number> = {},
    ): Promise<WriteOperation> {
      const current = await getRaw(uid, id);
      const incremented = Object.fromEntries(
        Object.entries(increments).map(([key, delta]) => [
          key,
          Number(current.data[key] ?? 0) + delta,
        ]),
      );
      const merged = parse({
        ...inputFields(current.data),
        ...patch,
        ...incremented,
      }) as DocumentData;
      const derived = config.derive?.(merged as z.output<TSchema>) ?? {};
      const store = await getStore();
      const changed = Object.fromEntries([
        ...[...Object.keys(patch), ...Object.keys(derived)].map((key) => [
          key,
          key in derived ? derived[key] : merged[key],
        ]),
        ...Object.entries(increments).map(([key, delta]) => [key, store.increment(delta)]),
      ]);
      return {
        type: "update",
        path: docPath(uid, id),
        data: clean({ ...changed, updatedAt: store.now() }),
      };
    },

    /** Prepara uma exclusão lógica para um lote. */
    async buildRemove(uid: string, id: string): Promise<WriteOperation> {
      const store = await getStore();
      return {
        type: "update",
        path: docPath(uid, id),
        data: { deletedAt: store.now(), updatedAt: store.now() },
      };
    },

    /** Cria o documento e devolve o id. Aceita um id fixo (idempotência, ex.: categorias padrão). */
    async create(uid: string, input: unknown, options: { id?: string } = {}): Promise<string> {
      const { id, path, data } = await this.buildCreate(uid, input, options);
      await (await getStore()).set(path, data);
      return id;
    },

    /** Atualiza só os campos informados, validando o documento resultante inteiro. */
    async update(uid: string, id: string, patch: Partial<z.input<TSchema>>): Promise<void> {
      const { path, data } = await this.buildUpdate(uid, id, patch);
      await (await getStore()).update(path, data);
    },

    /** Exclusão lógica: some das listas, mas continua no histórico. */
    async remove(uid: string, id: string): Promise<void> {
      await getRaw(uid, id);
      const { path, data } = await this.buildRemove(uid, id);
      await (await getStore()).update(path, data);
    },

    /** Desfaz uma exclusão lógica. */
    async restore(uid: string, id: string): Promise<void> {
      const store = await getStore();
      const found = await store.get(docPath(uid, id));
      if (!found) throw new DataError("not-found");
      await store.update(docPath(uid, id), { deletedAt: null, updatedAt: store.now() });
    },
  };
}

export type EntityRepository<
  TSchema extends z.ZodType,
  TServer extends object = object,
> = ReturnType<typeof createEntityRepository<TSchema, TServer>>;
