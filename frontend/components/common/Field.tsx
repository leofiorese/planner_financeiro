"use client";

import { cloneElement, isValidElement, useId } from "react";
import DatePicker from "@/components/DatePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
}

interface FieldProps {
  label: string;
  /** Texto de ajuda exibido abaixo do controle. */
  hint?: React.ReactNode;
  /** Mensagem de erro (anunciada com `role="alert"`). */
  error?: React.ReactNode;
  required?: boolean;
  /** Esconde o label visualmente, mantendo-o para leitores de tela. */
  srOnlyLabel?: boolean;
  className?: string;
  /** Controle: um elemento (recebe `id`/`aria-*` por clone) ou uma função que recebe essas props. */
  children: React.ReactElement | ((props: FieldControlProps) => React.ReactNode);
}

/**
 * Label + controle + hint/erro, com `htmlFor`/`id` gerados por `useId` e `aria-describedby`.
 */
export function Field({ label, hint, error, required, srOnlyLabel, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const controlProps: FieldControlProps = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    "aria-required": required || undefined,
  };

  const control =
    typeof children === "function"
      ? children(controlProps)
      : isValidElement(children)
        ? cloneElement(children as React.ReactElement<Record<string, unknown>>, { ...controlProps })
        : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn(srOnlyLabel && "sr-only")}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value" | "type">;

interface NumberInputProps extends InputProps {
  value: string | number;
  onChange: (value: string) => void;
}

/** Input numérico controlado (`inputMode="decimal"`). O valor trafega como string, como nos forms. */
export function NumberInput({ value, onChange, className, ...props }: NumberInputProps) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("tabular-nums", className)}
      {...props}
    />
  );
}

/** Input de valor monetário com o símbolo da moeda atual como prefixo. */
export function MoneyInput({ value, onChange, className, ...props }: NumberInputProps) {
  const { getCurrencyInfo } = useCurrency();
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
      >
        {getCurrencyInfo().symbol}
      </span>
      <NumberInput
        step="0.01"
        min="0"
        value={value}
        onChange={onChange}
        className={cn("pl-10", className)}
        {...props}
      />
    </div>
  );
}

interface DateFieldProps {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

/**
 * Campo de data (YYYY-MM-DD) sobre o `DatePicker` existente. Use dentro de um `<Field>` e repasse
 * o `id` recebido (`{(p) => <DateField id={p.id} ... />}`).
 */
export function DateField(props: DateFieldProps) {
  return <DatePicker {...props} />;
}
