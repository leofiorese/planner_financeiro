"use client";

import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SUGGESTED_CATEGORY_EMOJIS } from "@/utils/categoryRules";
import { useState } from "react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

/** Seletor de emoji em Popover (Radix: colide com as bordas da tela e fecha com Esc). */
export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-label="Escolher emoji">
          <SmilePlus aria-hidden />
          Escolher
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-64">
        <div className="grid grid-cols-6 gap-1" role="group" aria-label="Emojis sugeridos">
          {SUGGESTED_CATEGORY_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              aria-label={`Usar emoji ${emoji}`}
              className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-accent"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
