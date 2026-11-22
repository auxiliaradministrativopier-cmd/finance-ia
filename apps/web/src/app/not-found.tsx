import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center p-4">
      <EmptyState
        icon={<Compass aria-hidden="true" />}
        title="Página não encontrada"
        description="O endereço pode ter mudado ou não existe mais. Volte ao início para continuar."
        action={
          <Link href="/inicio" className={buttonVariants()}>
            Ir para o início
          </Link>
        }
      />
    </main>
  );
}
