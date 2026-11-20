export const SIDEBAR_STORAGE_KEY = "fp-sidebar-collapsed";

/**
 * Script inline do <head>: aplica `data-sidebar="collapsed"` no <html> antes da hidratação,
 * evitando layout shift quando o usuário deixou a sidebar recolhida.
 */
export const sidebarInitScript = `(function(){try{if(localStorage.getItem("${SIDEBAR_STORAGE_KEY}")==="1"){document.documentElement.setAttribute("data-sidebar","collapsed")}}catch(e){}})();`;

export function readSidebarCollapsed(): boolean {
  return document.documentElement.getAttribute("data-sidebar") === "collapsed";
}

export function writeSidebarCollapsed(collapsed: boolean) {
  const root = document.documentElement;
  if (collapsed) root.setAttribute("data-sidebar", "collapsed");
  else root.removeAttribute("data-sidebar");
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    /* localStorage indisponível */
  }
}
