"use client";

import { useEffect, useState } from "react";

/**
 * Retorna se a media query casa. No servidor (e no primeiro render do cliente) devolve
 * `defaultValue`, evitando divergência de hidratação.
 */
export function useMediaQuery(query: string, defaultValue = false): boolean {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
