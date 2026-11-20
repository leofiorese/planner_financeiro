import Link from "next/link";
import { ArrowRight, Receipt, Rocket, Target, TrendingUp, type LucideIcon } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS: {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  {
    href: "/income",
    title: "1. Adicione sua renda",
    description:
      "Comece adicionando todas as suas fontes de renda: salário, trabalho autônomo, investimentos ou qualquer outra renda regular.",
    cta: "Adicionar renda",
    icon: TrendingUp,
    iconClass: "bg-income/10 text-income",
  },
  {
    href: "/expenses",
    title: "2. Rastreie suas despesas",
    description:
      "Adicione suas despesas mensais como aluguel, serviços públicos, compras e assinaturas para ter uma visão completa.",
    cta: "Adicionar despesas",
    icon: Receipt,
    iconClass: "bg-expense/10 text-expense",
  },
  {
    href: "/goals",
    title: "3. Defina suas metas",
    description:
      "Defina metas financeiras como fundo de emergência, férias ou aposentadoria para se manter motivado e focado.",
    cta: "Definir metas",
    icon: Target,
    iconClass: "bg-primary/10 text-primary",
  },
];

/** Onboarding do primeiro uso (plano vazio). */
export function OnboardingCard() {
  return (
    <SectionCard
      title="Bem-vindo à sua jornada financeira!"
      description="Vamos começar com alguns passos simples para desbloquear todo o poder do planejador."
      actions={
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Rocket className="size-5" aria-hidden />
        </span>
      }
      contentClassName="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      {STEPS.map(({ href, title, description, cta, icon: Icon, iconClass }) => (
        <div key={href} className="flex flex-col justify-between rounded-xl border bg-muted/30 p-4">
          <div>
            <span className={cn("mb-3 flex size-8 items-center justify-center rounded-lg", iconClass)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <h3 className="mb-1 text-sm font-semibold">{title}</h3>
            <p className="mb-4 text-sm text-muted-foreground">{description}</p>
          </div>
          <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            {cta}
            <ArrowRight aria-hidden />
          </Link>
        </div>
      ))}
    </SectionCard>
  );
}
