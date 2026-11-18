import { escolhasValidas, precoUnitario, type Escolhas } from "./preco.ts";
import type { Centavos, Produto } from "./tipos.ts";

export const QUANTIDADE_MAXIMA = 99;
export const OBSERVACAO_MAXIMA = 140;

export interface ItemDaSacola {
  /** Identifica a combinação de produto, opções e observação: itens iguais somam quantidade. */
  chave: string;
  produtoId: string;
  escolhas: Escolhas;
  observacao: string;
  quantidade: number;
}

export type NovoItem = Omit<ItemDaSacola, "chave">;

export type AcaoDaSacola =
  | { tipo: "adicionar"; item: NovoItem }
  | { tipo: "quantidade"; chave: string; quantidade: number }
  | { tipo: "remover"; chave: string }
  | { tipo: "esvaziar" }
  | { tipo: "substituir"; itens: ItemDaSacola[] };

export function chaveDoItem(produtoId: string, escolhas: Escolhas, observacao: string): string {
  const partes = Object.keys(escolhas)
    .sort()
    .filter((grupo) => (escolhas[grupo]?.length ?? 0) > 0)
    .map((grupo) => `${grupo}=${[...(escolhas[grupo] ?? [])].sort().join(",")}`);
  return [produtoId, partes.join(";"), observacao.trim().toLowerCase()].join("|");
}

function limitar(quantidade: number): number {
  return Math.min(QUANTIDADE_MAXIMA, Math.max(0, Math.trunc(quantidade)));
}

export function sacolaReducer(itens: ItemDaSacola[], acao: AcaoDaSacola): ItemDaSacola[] {
  switch (acao.tipo) {
    case "adicionar": {
      const observacao = acao.item.observacao.trim().slice(0, OBSERVACAO_MAXIMA);
      const chave = chaveDoItem(acao.item.produtoId, acao.item.escolhas, observacao);
      const quantidade = limitar(acao.item.quantidade);
      if (quantidade === 0) return itens;
      const existente = itens.find((item) => item.chave === chave);
      if (existente) {
        return itens.map((item) =>
          item.chave === chave ? { ...item, quantidade: limitar(item.quantidade + quantidade) } : item,
        );
      }
      return [...itens, { ...acao.item, observacao, quantidade, chave }];
    }
    case "quantidade": {
      const quantidade = limitar(acao.quantidade);
      if (quantidade === 0) return itens.filter((item) => item.chave !== acao.chave);
      return itens.map((item) => (item.chave === acao.chave ? { ...item, quantidade } : item));
    }
    case "remover":
      return itens.filter((item) => item.chave !== acao.chave);
    case "esvaziar":
      return [];
    case "substituir":
      return acao.itens;
  }
}

export function totalDoItem(item: ItemDaSacola, produtos: ReadonlyMap<string, Produto>): Centavos {
  const produto = produtos.get(item.produtoId);
  return produto ? precoUnitario(produto, item.escolhas) * item.quantidade : 0;
}

export function subtotal(itens: readonly ItemDaSacola[], produtos: ReadonlyMap<string, Produto>): Centavos {
  return itens.reduce((soma, item) => soma + totalDoItem(item, produtos), 0);
}

export function quantidadeTotal(itens: readonly ItemDaSacola[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

function ehTexto(valor: unknown): valor is string {
  return typeof valor === "string";
}

/**
 * Reconstrói a sacola salva no navegador. O preço nunca vem do que foi salvo: só o
 * produto, as opções e a quantidade, conferidos contra o cardápio atual. Item que não
 * existe mais, ficou indisponível ou tem opção inválida é descartado.
 */
export function restaurarSacola(bruto: unknown, produtos: ReadonlyMap<string, Produto>): ItemDaSacola[] {
  if (!Array.isArray(bruto)) return [];
  let itens: ItemDaSacola[] = [];
  for (const registro of bruto.slice(0, 50)) {
    if (typeof registro !== "object" || registro === null) continue;
    const { produtoId, escolhas, observacao, quantidade } = registro as Record<string, unknown>;
    if (!ehTexto(produtoId) || !ehTexto(observacao) || typeof quantidade !== "number") continue;
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > QUANTIDADE_MAXIMA) continue;
    if (typeof escolhas !== "object" || escolhas === null || Array.isArray(escolhas)) continue;
    const listas = Object.entries(escolhas as Record<string, unknown>);
    if (!listas.every(([, lista]) => Array.isArray(lista) && lista.every(ehTexto))) continue;
    const escolhasLimpas: Escolhas = Object.fromEntries(listas) as Escolhas;
    const produto = produtos.get(produtoId);
    if (!produto || produto.indisponivel || !escolhasValidas(produto, escolhasLimpas)) continue;
    itens = sacolaReducer(itens, {
      tipo: "adicionar",
      item: { produtoId, escolhas: escolhasLimpas, observacao, quantidade },
    });
  }
  return itens;
}
