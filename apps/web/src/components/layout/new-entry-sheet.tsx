"use client";

import { EntrySheet } from "@/features/cash-flow/components/entry-sheet";

/** Folha "Novo lançamento" (tela 19), aberta pelo botão "+" da navegação. */
export function NewEntrySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return <EntrySheet open={open} onOpenChange={onOpenChange} />;
}
