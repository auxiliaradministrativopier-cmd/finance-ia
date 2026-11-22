import { Skeleton } from "@/components/ui/skeleton";

/** Carregamento no formato exato do Dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Carregando o painel">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-56" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-52 rounded-xl lg:col-span-8" />
        <Skeleton className="h-52 rounded-lg lg:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
