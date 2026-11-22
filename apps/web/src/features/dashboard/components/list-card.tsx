import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function ListCard({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <Card aria-labelledby={id} className="gap-1">
      <CardHeader className="pb-2">
        <CardTitle id={id}>{title}</CardTitle>
        <Link href={action.href} className="text-label font-semibold text-brand hover:underline">
          {action.label}
        </Link>
      </CardHeader>
      {children}
    </Card>
  );
}
