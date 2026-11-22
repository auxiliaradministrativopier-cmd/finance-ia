"use client";

import type { CategoryType } from "@finance-ia/shared";
import { Archive, ArchiveRestore, ChevronDown, Pencil, Plus, Tags } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useCategories, type Category } from "../use-categories";
import { CategoryFormSheet, type CategoryFormValues } from "./category-form-sheet";

const tabs: { type: CategoryType; label: string }[] = [
  { type: "expense", label: "Despesas" },
  { type: "income", label: "Receitas" },
];

/** Tela 23: Categorias. */
export function CategoriesPage() {
  const { status, items, error, create, update, setArchived } = useCategories();
  const toast = useToast();
  const [type, setType] = useState<CategoryType>("expense");
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const ofType = items.filter((category) => category.type === type);
  const active = ofType.filter((category) => !category.archived);
  const archived = ofType.filter((category) => category.archived);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function submit(values: CategoryFormValues) {
    if (editing) {
      await update(
        editing.id,
        { name: values.name, icon: values.icon, color: values.color, essential: values.essential },
        editing.type,
      );
      toast({ title: "Categoria atualizada." });
    } else {
      await create(values);
      setType(values.type);
      toast({ title: "Categoria criada." });
    }
    setFormOpen(false);
  }

  async function archive(category: Category) {
    try {
      await setArchived(category.id, true);
      toast({
        title: `"${category.name}" foi arquivada.`,
        action: { label: "Desfazer", onClick: () => void setArchived(category.id, false) },
      });
    } catch (caught) {
      toast({
        title: caught instanceof Error ? caught.message : "Não foi possível arquivar.",
        tone: "error",
      });
    }
  }

  async function restore(category: Category) {
    try {
      await setArchived(category.id, false);
      toast({ title: `"${category.name}" voltou para a lista.` });
    } catch (caught) {
      toast({
        title: caught instanceof Error ? caught.message : "Não foi possível restaurar.",
        tone: "error",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorias"
        description="Organize seus lançamentos. Categorias arquivadas somem das escolhas, mas o histórico continua."
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            Nova categoria
          </Button>
        }
      />

      <div role="group" aria-label="Tipo de categoria" className="flex gap-2">
        {tabs.map((tab) => (
          <Chip key={tab.type} selected={type === tab.type} onClick={() => setType(tab.type)}>
            {tab.label}
            <span className="text-ink-muted tabular">
              {items.filter((c) => c.type === tab.type && !c.archived).length}
            </span>
          </Chip>
        ))}
      </div>

      {status === "error" ? <Alert tone="danger">{error.message}</Alert> : null}

      {status === "loading" ? (
        <Card className="gap-0 p-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </Card>
      ) : active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tags aria-hidden="true" />}
            title={`Nenhuma categoria de ${type === "expense" ? "despesa" : "receita"}`}
            description="Crie categorias para organizar seus lançamentos e entender para onde vai o dinheiro."
            action={<Button onClick={openCreate}>Criar categoria</Button>}
          />
        </Card>
      ) : (
        <Card
          as="section"
          aria-label={type === "expense" ? "Categorias de despesa" : "Categorias de receita"}
          className="gap-0 p-2"
        >
          <ul className="flex flex-col">
            {active.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 border-b border-line px-2 py-2.5 last:border-0"
              >
                <CategoryIcon icon={category.icon} color={category.color} />
                <span className="min-w-0 flex-1 truncate text-body font-medium">
                  {category.name}
                </span>
                {category.essential ? <Badge tone="neutral">Essencial</Badge> : null}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Editar ${category.name}`}
                  onClick={() => {
                    setEditing(category);
                    setFormOpen(true);
                  }}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Arquivar ${category.name}`}
                  onClick={() => archive(category)}
                >
                  <Archive aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {archived.length > 0 ? (
        <section aria-label="Categorias arquivadas" className="flex flex-col gap-3">
          <Button
            variant="ghost"
            className="self-start"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((value) => !value)}
          >
            <ChevronDown className={showArchived ? "rotate-180" : undefined} aria-hidden="true" />
            Arquivadas ({archived.length})
          </Button>
          {showArchived ? (
            <Card className="gap-0 p-2">
              <ul className="flex flex-col">
                {archived.map((category) => (
                  <li
                    key={category.id}
                    className="flex items-center gap-3 border-b border-line px-2 py-2.5 opacity-80 last:border-0"
                  >
                    <CategoryIcon icon={category.icon} color="chart-6" />
                    <span className="min-w-0 flex-1 truncate text-body text-ink-muted">
                      {category.name}
                    </span>
                    <Button variant="tertiary" size="sm" onClick={() => restore(category)}>
                      <ArchiveRestore aria-hidden="true" />
                      Restaurar
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </section>
      ) : null}

      <CategoryFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        defaultType={type}
        onSubmit={submit}
      />
    </div>
  );
}
