import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Ações contextuais (botões) alinhadas à direita. */
  actions?: React.ReactNode;
  /** Conteúdo abaixo do título, normalmente um grid de `StatCard`. */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
