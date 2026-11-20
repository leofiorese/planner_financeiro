import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: React.ReactNode;
  /** Ações no canto direito do cabeçalho. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Card de seção: cabeçalho (título, descrição, ações) + conteúdo. */
export function SectionCard({ title, description, actions, children, className, contentClassName }: SectionCardProps) {
  return (
    <Card className={cn("gap-4 rounded-xl py-5 shadow-xs", className)}>
      {(title || actions) && (
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5">
          <div className="min-w-0 space-y-1">
            {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
            {description && <CardDescription className="text-sm">{description}</CardDescription>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("px-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
