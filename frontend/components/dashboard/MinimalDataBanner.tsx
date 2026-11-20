import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MinimalDataBannerProps {
  missingIncome: boolean;
  missingExpenses: boolean;
}

export function MinimalDataBanner({ missingIncome, missingExpenses }: MinimalDataBannerProps) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning">
          <TriangleAlert className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Complete seu perfil financeiro</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Estão faltando algumas informações importantes. Adicione renda e despesas para obter insights mais
            precisos.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {missingIncome && (
          <Link href="/income" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Adicionar renda
          </Link>
        )}
        {missingExpenses && (
          <Link href="/expenses" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Adicionar despesas
          </Link>
        )}
      </div>
    </div>
  );
}
