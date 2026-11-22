export type DataErrorCode =
  | "permission-denied"
  | "not-found"
  | "invalid"
  | "unavailable"
  | "unauthenticated"
  | "conflict"
  | "unknown";

const messages: Record<DataErrorCode, string> = {
  "permission-denied": "Você não tem permissão para acessar estes dados.",
  "not-found": "Não encontramos este registro. Ele pode ter sido removido.",
  invalid: "Alguns dados estão inválidos. Confira os campos destacados.",
  unavailable: "Sem conexão com o servidor. Tente de novo em instantes.",
  unauthenticated: "Sua sessão terminou. Entre de novo para continuar.",
  conflict: "Este registro já existe.",
  unknown: "Não foi possível concluir agora. Tente de novo em instantes.",
};

/** Erro da camada de dados, com mensagem em português e, quando houver, erros por campo. */
export class DataError extends Error {
  readonly code: DataErrorCode;
  readonly fields: Record<string, string>;

  constructor(
    code: DataErrorCode,
    options: { message?: string; fields?: Record<string, string>; cause?: unknown } = {},
  ) {
    super(options.message ?? messages[code], { cause: options.cause });
    this.name = "DataError";
    this.code = code;
    this.fields = options.fields ?? {};
  }
}

const firestoreCodes: Record<string, DataErrorCode> = {
  "permission-denied": "permission-denied",
  "not-found": "not-found",
  "invalid-argument": "invalid",
  "failed-precondition": "invalid",
  "already-exists": "conflict",
  unavailable: "unavailable",
  "deadline-exceeded": "unavailable",
  unauthenticated: "unauthenticated",
};

/** Converte erros do Firestore (ou qualquer outro) em DataError. */
export function toDataError(error: unknown): DataError {
  if (error instanceof DataError) return error;
  const raw =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const code = raw.replace(/^firestore\//, "");
  return new DataError(firestoreCodes[code] ?? "unknown", { cause: error });
}
