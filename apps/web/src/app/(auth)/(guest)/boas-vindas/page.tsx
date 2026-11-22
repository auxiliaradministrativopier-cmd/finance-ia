import { Gauge, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Boas-vindas",
  description:
    "Organize suas finanças com inteligência artificial e acompanhe sua saúde financeira.",
};

const highlights = [
  {
    icon: Wallet,
    title: "Todo o seu dinheiro, num só lugar",
    text: "Contas, cartões, metas, dívidas e investimentos.",
  },
  {
    icon: Sparkles,
    title: "Uma IA que entende suas finanças",
    text: "Respostas baseadas nos seus números reais.",
  },
  {
    icon: Gauge,
    title: "Seu IFA, de 0 a 1000",
    text: "A nota da sua saúde financeira e como melhorá-la.",
  },
] as const;

export default function WelcomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-display">Seu dinheiro, com inteligência.</h1>
        <p className="text-body-lg text-ink-muted">
          O Finance IA organiza suas finanças, explica o que está acontecendo e mostra o próximo
          passo.
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {highlights.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-body font-semibold">{title}</span>
              <span className="text-body text-ink-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3">
        <Link href="/cadastro" className={buttonVariants({ size: "lg", block: true })}>
          Criar conta grátis
        </Link>
        <Link
          href="/entrar"
          className={buttonVariants({ variant: "secondary", size: "lg", block: true })}
        >
          Já tenho conta
        </Link>
      </div>
      <p className="flex items-center gap-2 text-caption text-ink-muted lg:hidden">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Seus dados são criptografados e você pode excluí-los quando quiser.
      </p>
    </div>
  );
}
