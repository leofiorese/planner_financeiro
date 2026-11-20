import { CheckCircle2, CircleAlert, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutTone = "info" | "success" | "warning" | "danger";

const TONE: Record<CalloutTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: "border-primary/30 bg-primary/5", icon: "text-primary", Icon: Info },
  success: { box: "border-success/30 bg-success/10", icon: "text-success", Icon: CheckCircle2 },
  warning: { box: "border-warning/30 bg-warning/10", icon: "text-warning", Icon: TriangleAlert },
  danger: { box: "border-danger/30 bg-danger/10", icon: "text-danger", Icon: CircleAlert },
};

interface CalloutProps {
  tone?: CalloutTone;
  /** Use `alert` para mensagens que precisam ser anunciadas na hora (erros); `status` para avisos suaves. */
  role?: "alert" | "status";
  children: React.ReactNode;
  className?: string;
}

/**
 * Aviso em linha (informação, sucesso, atenção ou erro). O texto usa a cor padrão e só o ícone leva
 * a cor do tom, então o contraste do texto não depende do tema. O ícone não é a única pista: o
 * conteúdo deve dizer o que está acontecendo.
 */
export function Callout({ tone = "info", role, children, className }: CalloutProps) {
  const { box, icon, Icon } = TONE[tone];
  return (
    <div role={role} className={cn("flex items-start gap-2.5 rounded-lg border p-3 text-sm", box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", icon)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-2">{children}</div>
    </div>
  );
}
