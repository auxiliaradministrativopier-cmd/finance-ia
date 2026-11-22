import { addMonthsToMonth } from "@finance-ia/finance-core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthTitle } from "../format";

export function MonthSwitcher({
  month,
  currentMonth,
  onChange,
}: {
  month: string;
  currentMonth: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Mês">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Mês anterior"
        onClick={() => onChange(addMonthsToMonth(month, -1))}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span className="min-w-40 text-center text-h3 font-semibold" aria-live="polite">
        {formatMonthTitle(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonthsToMonth(month, 1))}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      {month !== currentMonth ? (
        <Button variant="tertiary" size="sm" onClick={() => onChange(currentMonth)}>
          Mês atual
        </Button>
      ) : null}
    </div>
  );
}
