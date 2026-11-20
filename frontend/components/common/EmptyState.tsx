import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Ação principal (ex.: botão "Adicionar"). */
  action?: React.ReactNode;
  variant?: "default" | "dashed";
  /** Nível do título. Use 2 quando o estado vazio vem logo abaixo do `h1` da página (sem `h2` antes). */
  headingLevel?: 2 | 3;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "dashed",
  headingLevel = 3,
  className,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center",
        variant === "dashed" ? "border border-dashed bg-card/50" : "bg-card",
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" aria-hidden />
        </span>
      )}
      <Heading className="text-base font-semibold">{title}</Heading>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
