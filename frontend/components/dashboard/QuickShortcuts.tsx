import Link from "next/link";
import { Car, Gift, Plus, Target, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SHORTCUTS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/income", label: "Nova renda", icon: Plus },
  { href: "/expenses", label: "Nova despesa", icon: Plus },
  { href: "/car", label: "Veículo", icon: Car },
  { href: "/wishlist", label: "Desejos", icon: Gift },
  { href: "/goals", label: "Metas", icon: Target },
];

/** Atalhos de navegação do dashboard (candidato a remoção: redundante com a sidebar; ver Bloqueios). */
export function QuickShortcuts() {
  return (
    <nav
      aria-label="Atalhos rápidos"
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-xs"
    >
      <span className="pl-1 pr-2 text-sm font-medium text-muted-foreground">Atalhos rápidos:</span>
      {SHORTCUTS.map(({ href, label, icon: Icon }) => (
        <Link key={href + label} href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <Icon aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
