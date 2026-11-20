/**
 * Helpers de data LOCAL (sem dependências).
 *
 * O app trabalha com datas de negócio como strings "YYYY-MM-DD" / "YYYY-MM".
 * `new Date("YYYY-MM-DD")` é interpretado como meia-noite UTC e, lido com
 * getters locais, vira o dia anterior em UTC-3. Estas funções evitam isso:
 * toda conversão string <-> Date usa componentes locais.
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

function makeLocal(year: number, monthIndex: number, day: number): Date {
  // setFullYear evita que anos 0-99 sejam mapeados para 1900-1999
  const d = new Date(2000, 0, 1);
  d.setFullYear(year, monthIndex, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Converte "YYYY-MM-DD", "YYYY-MM" (dia 1) ou uma string ISO completa
 * ("YYYY-MM-DDTHH:mm:ss.sssZ") em um Date local à meia-noite.
 *
 * Em strings ISO completas só a parte da data é usada (sem conversão de fuso).
 * Entrada inválida devolve um Date inválido (`isNaN(d.getTime())`).
 */
export function parseLocalDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso ?? "");
  if (!match) return new Date(NaN);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = match[3] ? Number(match[3]) : 1;
  return makeLocal(year, month - 1, day);
}

/** Date -> "YYYY-MM-DD" usando getters locais. */
export function toLocalISODate(d: Date): string {
  return `${String(d.getFullYear()).padStart(4, "0")}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Date -> "YYYY-MM" usando getters locais. */
export function toLocalISOMonth(d: Date): string {
  return `${String(d.getFullYear()).padStart(4, "0")}-${pad2(d.getMonth() + 1)}`;
}

/** Data de hoje (local) em "YYYY-MM-DD". */
export function todayLocalISO(): string {
  return toLocalISODate(new Date());
}

/** Mês atual (local) em "YYYY-MM". */
export function currentMonthLocalISO(): string {
  return toLocalISOMonth(new Date());
}

/** Quantidade de dias de um mês (monthIndex 0-11). */
export function daysInMonth(year: number, monthIndex: number): number {
  return makeLocal(year, monthIndex + 1, 0).getDate();
}

/** Data local do `day` no mês; se o mês não tem o dia, usa o último dia do mês. */
export function clampDay(year: number, monthIndex: number, day: number): Date {
  // normaliza monthIndex fora de 0-11 (ex.: -1 ou 12)
  const base = makeLocal(year, monthIndex, 1);
  const y = base.getFullYear();
  const m = base.getMonth();
  return makeLocal(y, m, Math.min(Math.max(1, day), daysInMonth(y, m)));
}

/**
 * Soma `n` meses mantendo o dia, com clamp (31/jan + 1 = 28 ou 29/fev).
 * Atenção: aplicar sobre o resultado de outro clamp perde o dia original;
 * para séries, sempre some a partir da âncora (`addMonthsClamped(anchor, k)`).
 */
export function addMonthsClamped(date: Date, n: number): Date {
  return clampDay(date.getFullYear(), date.getMonth() + n, date.getDate());
}

/** Soma `n` dias (calendário local). */
export function addDays(date: Date, n: number): Date {
  return makeLocal(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

/** Soma `n` dias a uma string "YYYY-MM-DD". */
export function addDaysISO(iso: string, n: number): string {
  return toLocalISODate(addDays(parseLocalDate(iso), n));
}

/**
 * Diferença em dias de calendário (b - a), ignorando horário de verão:
 * compara os componentes locais como se fossem UTC.
 */
export function diffInDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/** Diferença em dias entre duas strings "YYYY-MM-DD" (b - a). */
export function diffInDaysISO(a: string, b: string): number {
  return diffInDays(parseLocalDate(a), parseLocalDate(b));
}

/** Comparação lexicográfica de "YYYY-MM-DD" (segura para datas ISO). */
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** `start <= date <= end` (inclusivo), comparando strings "YYYY-MM-DD". */
export function isWithinISO(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}
