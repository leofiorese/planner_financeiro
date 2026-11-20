"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import { RowActions } from "@/components/common/RowActions";
import type { WishlistItem } from "@/components/wishlist/useWishlist";
import { useCurrency } from "@/context/CurrencyContext";
import { formatDate } from "@/utils/format";

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface WishlistCardProps {
  item: WishlistItem;
  onEdit: (item: WishlistItem) => void;
  onDelete: (item: WishlistItem) => void;
}

export function WishlistCard({ item, onEdit, onDelete }: WishlistCardProps) {
  const { formatCurrency } = useCurrency();
  const links = [item.link1, item.link2, item.link3].filter((l) => l && l.trim() !== "");

  return (
    <article className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/50">
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {item.brand && (
              <span className="mb-1.5 inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                {item.brand}
              </span>
            )}
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
          </div>
          <RowActions
            className="shrink-0"
            itemLabel={`item ${item.name}`}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        </div>

        <div className="mb-2.5 text-lg font-semibold tabular-nums text-primary">
          {formatCurrency(Number(item.price) || 0)}
        </div>

        {item.target_date && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1 text-xs font-medium">
            <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span>
              Previsão: <strong className="font-semibold">{formatDate(item.target_date)}</strong>
            </span>
          </div>
        )}

        {item.description && (
          <p className="mb-3.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}
      </div>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t pt-3">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={sanitizeUrl(link)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-semibold text-primary shadow-xs transition-colors hover:border-primary/60 hover:bg-accent"
            >
              <ExternalLink className="size-3 shrink-0" aria-hidden />
              <span>Link {idx + 1}</span>
              <span className="sr-only"> (abre em nova aba) de {item.name}</span>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
