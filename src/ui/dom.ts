// Acesso aos elementos do HTML. Falha cedo se algum id da página não existir.
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado na página`);
  return el as T;
}
