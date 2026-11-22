import { Skeleton } from "@/components/ui/skeleton";

/** Carregamento das telas internas: skeletons no formato do conteúdo. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Carregando">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-56" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}
