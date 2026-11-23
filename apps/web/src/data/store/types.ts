/** Documento lido do banco: Timestamps já convertidos em Date. */
export type DocumentData = Record<string, unknown>;

export interface StoredDocument {
  id: string;
  data: DocumentData;
}

export type WhereFilter = [field: string, op: "==" | "in", value: unknown];

export interface QueryOptions {
  where?: WhereFilter[];
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;
}

export type WriteOperation =
  | { type: "set"; path: string; data: DocumentData }
  | { type: "update"; path: string; data: DocumentData };

/**
 * Armazenamento de documentos. Isola o app do Firestore: o mesmo código de repositório
 * roda no banco real, nos emuladores e em memória (modo demonstração e testes).
 */
export interface DataStore {
  readonly kind: "firestore" | "memory";
  get(path: string): Promise<StoredDocument | null>;
  query(collectionPath: string, options?: QueryOptions): Promise<StoredDocument[]>;
  watchDocument(
    path: string,
    onNext: (doc: StoredDocument | null) => void,
    onError: (error: Error) => void,
  ): () => void;
  watchQuery(
    collectionPath: string,
    options: QueryOptions,
    onNext: (docs: StoredDocument[]) => void,
    onError: (error: Error) => void,
  ): () => void;
  /** Gera um id novo para um documento da coleção. */
  newId(collectionPath: string): string;
  set(path: string, data: DocumentData): Promise<void>;
  update(path: string, data: DocumentData): Promise<void>;
  batch(operations: WriteOperation[]): Promise<void>;
  /** Marca de "agora" que o banco preenche (serverTimestamp no Firestore). */
  now(): unknown;
  /**
   * Soma atômica a um campo numérico (increment no Firestore). Duas gravações ao mesmo tempo,
   * inclusive offline em aparelhos diferentes, nunca sobrescrevem uma à outra.
   */
  increment(delta: number): unknown;
}
