"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Check,
  ClipboardList,
  Copy,
  PiggyBank,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Field } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFinancialState } from "@/context";
import { useCurrency } from "@/context/CurrencyContext";
import { toast } from "@/lib/toast";
import { Frequency } from "@/types";
import { calculateRecurringMonthlyAmount } from "@/utils/forecastCalculator";

interface AskAIButtonProps {
  className?: string;
}

const QUICK_OPTIONS: { id: string; title: string; description: string; icon: LucideIcon }[] = [
  { id: "overview", title: "Visão geral financeira", description: "Panorama completo da sua situação atual", icon: BarChart3 },
  { id: "savings", title: "Oportunidades de economia", description: "Onde dá para gastar menos e poupar mais", icon: PiggyBank },
  { id: "expenses", title: "Análise de despesas", description: "Padrões e categorias que mais pesam", icon: TrendingDown },
  { id: "goals", title: "Progresso das metas", description: "Avalie prazos e aportes das suas metas", icon: Target },
  { id: "budget", title: "Revisão do orçamento", description: "Compare receitas, despesas e sobra mensal", icon: ClipboardList },
  { id: "investment", title: "Estratégia de investimento", description: "Ideias para fazer o dinheiro render", icon: TrendingUp },
];

export default function AskAIButton({ className = "" }: AskAIButtonProps) {
  const state = useFinancialState();
  const { formatCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"custom" | "quick">("quick");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const generateFinancialSummary = () => {
    if (!state.userPlan) return "";

    const { income, expenses, goals, currentBalance } = state.userPlan;

    const totalMonthlyIncome = income
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + calculateRecurringMonthlyAmount(i.amount, i.frequency), 0);

    const totalMonthlyExpenses = expenses
      .filter((e) => e.isActive)
      .reduce((sum, e) => sum + calculateRecurringMonthlyAmount(e.amount, e.frequency || Frequency.MONTHLY), 0);

    const netCashflow = totalMonthlyIncome - totalMonthlyExpenses;
    const savingsRate = totalMonthlyIncome > 0 ? (netCashflow / totalMonthlyIncome) * 100 : 0;

    return `
# RESUMO FINANCEIRO
- Saldo atual disponível: ${formatCurrency(currentBalance)}
- Renda mensal total: ${formatCurrency(totalMonthlyIncome)}
- Despesas mensais totais: ${formatCurrency(totalMonthlyExpenses)}
- Fluxo de caixa mensal líquido: ${formatCurrency(netCashflow)}
- Taxa de poupança: ${savingsRate.toFixed(1)}%

## FONTES DE RENDA ATIVAS (${income.filter((i) => i.isActive).length}):
${income.filter((i) => i.isActive).map((i) => `- ${i.name}: ${formatCurrency(i.amount)} (${i.frequency})`).join("\n")}

## DESPESAS ATIVAS (${expenses.filter((e) => e.isActive).length}):
${expenses.filter((e) => e.isActive).map((e) => `- ${e.name} [${e.category}]: ${formatCurrency(e.amount)} (${e.paymentMethod || "PIX"})`).join("\n")}

## METAS ATIVAS (${goals.filter((g) => g.isActive).length}):
${goals.filter((g) => g.isActive).map((g) => `- ${g.name} [Prioridade: ${g.priority}]: Atual ${formatCurrency(g.currentAmount)} / Alvo ${formatCurrency(g.targetAmount)} (Data alvo: ${g.targetDate})`).join("\n")}
`;
  };

  const generateAnalysisPrompt = (analysisType: string) => {
    const financialData = generateFinancialSummary();
    return `Você é um Planejador Financeiro Certificado (CFP®) de alto nível. Analise detalhadamente a saúde financeira do cliente abaixo:\n\n${financialData}\n\nFoco da Análise: [${analysisType.toUpperCase()}]\n\nPor favor, forneça recomendações acionáveis, quantificadas em R$ e priorizadas por impacto.`;
  };

  const handleCustomQuery = () => {
    if (!query.trim()) return;
    const summary = generateFinancialSummary();
    setGeneratedPrompt(
      `Você é um CFP® sênior. Pergunta do cliente:\n"${query}"\n\nDados financeiros:\n${summary}`,
    );
  };

  const copyPromptToClipboard = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      toast.success("Prompt copiado para a área de transferência");
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o prompt");
    }
  };

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setIsOpen(true)}>
        <Sparkles className="text-primary" aria-hidden />
        Copiloto de IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 rounded-2xl p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
            <DialogTitle className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-4" aria-hidden />
              </span>
              Consultor financeiro com IA
            </DialogTitle>
            <DialogDescription>
              Gere análises profundas ou prompts sob medida com seus dados reais
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "custom" | "quick")} className="gap-4">
              <TabsList>
                <TabsTrigger value="quick">Análises rápidas</TabsTrigger>
                <TabsTrigger value="custom">Pergunta personalizada</TabsTrigger>
              </TabsList>

              <TabsContent value="quick">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {QUICK_OPTIONS.map(({ id, title, description, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setGeneratedPrompt(generateAnalysisPrompt(id))}
                      className="group rounded-xl border bg-muted/30 p-3.5 text-left transition-colors hover:border-primary"
                    >
                      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                        <span className="shrink-0 rounded-md bg-card p-1 text-muted-foreground group-hover:text-primary">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        {title}
                      </div>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-3">
                <Field label="O que você gostaria de perguntar ou simular sobre suas finanças?">
                  <Textarea
                    rows={3}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: Posso comprar um carro de R$ 45.000 em 12x sem comprometer minha reserva de emergência?"
                  />
                </Field>
                <Button type="button" onClick={handleCustomQuery} disabled={!query.trim()}>
                  Gerar prompt estruturado
                </Button>
              </TabsContent>
            </Tabs>

            {generatedPrompt && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="size-2 rounded-full bg-income" aria-hidden />
                    Prompt especializado gerado
                  </span>
                  <Button type="button" size="sm" onClick={copyPromptToClipboard}>
                    {copiedPrompt ? <Check aria-hidden /> : <Copy aria-hidden />}
                    {copiedPrompt ? "Copiado!" : "Copiar prompt"}
                  </Button>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-xl border bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
                  <pre className="whitespace-pre-wrap">{generatedPrompt}</pre>
                </div>

                <p className="text-xs text-muted-foreground">
                  Cole este prompt no ChatGPT, Claude ou Gemini para receber uma consultoria financeira
                  individualizada baseada no seu plano atual.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
