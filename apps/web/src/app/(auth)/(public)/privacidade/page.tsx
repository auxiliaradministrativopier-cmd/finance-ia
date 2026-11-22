import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Política de Privacidade" };

/** Documento legal. O texto definitivo precisa ser redigido e revisado por um profissional jurídico. */
export default function Page() {
  return (
    <article className="flex flex-col gap-6">
      <h1 className="text-h1">Política de Privacidade</h1>
      <p className="text-body-lg text-ink-muted">
        Este documento vai descrever como o Finance IA coleta, usa e protege seus dados. A versão
        oficial está em elaboração e será publicada antes do lançamento.
      </p>
      <Link href="/cadastro" className={buttonVariants({ variant: "secondary", block: true })}>
        Voltar ao cadastro
      </Link>
    </article>
  );
}
